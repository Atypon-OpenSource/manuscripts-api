/*!
 * © 2026 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Prisma, PrismaClient } from '@prisma/client'

type Json = Prisma.JsonValue

// Comments store a bare `userID` attr (matches @manuscripts/transform's
// CommentAttrs). Track-changes data (dataTracked) stores `authorID` and
// `reviewedByID` instead - @manuscripts/track-changes-plugin's actual
// runtime shape (confirmed in its compiled source, e.g.
// createNewPendingAttrs), which has drifted from
// @manuscripts/transform's now-stale DataTrackedAttrs.userID typing.
const USER_ID_KEYS = new Set(['userID', 'authorID', 'reviewedByID'])

function collectUserIds(value: Json, ids: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectUserIds(item, ids)
    }
  } else if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      if (USER_ID_KEYS.has(key) && typeof val === 'string' && val) {
        ids.add(val)
      } else {
        collectUserIds(val as Json, ids)
      }
    }
  }
}

function applyUserIdMap(value: Json, idMap: Map<string, string>): Json {
  if (Array.isArray(value)) {
    return value.map((item) => applyUserIdMap(item, idMap))
  }
  if (value && typeof value === 'object') {
    const result: Record<string, Json> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] =
        USER_ID_KEYS.has(key) && typeof val === 'string' && idMap.has(val)
          ? (idMap.get(val) as Json)
          : applyUserIdMap(val as Json, idMap)
    }
    return result
  }
  return value
}

// Tracked changes (dataTracked.authorID/reviewedByID, on nearly every
// node/mark type) and comments (a bare userID attr) embed whichever
// manuscripts-api user id was current when the editor made that edit.
// Older documents/steps still carry internal ids a parent-app user
// directory never heard of - resolve them to the stable connectUserID
// every time this is read, rather than rewriting storage.
export async function rewriteUserIds<T extends Json>(
  value: T,
  prisma: Pick<PrismaClient, 'user'>
): Promise<T> {
  const ids = new Set<string>()
  collectUserIds(value, ids)
  if (ids.size === 0) {
    return value
  }
  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, connectUserID: true },
  })
  if (users.length === 0) {
    return value
  }
  const idMap = new Map(users.map((u) => [u.id, u.connectUserID]))
  return applyUserIdMap(value, idMap) as T
}
