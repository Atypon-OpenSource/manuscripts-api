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

export interface DecodedSnapshotID {
  docID: string
  id: string
}

// A suffix outside base64url's alphabet ([A-Za-z0-9_-]) so the boundary is
// unambiguous, and outside the URL reserved characters (unlike "#", which
// starts a fragment — a client building a URL as `snapshot/${id}` would
// have this silently stripped before the request is ever sent).
const SUFFIX = '.v3'

export function encodeSnapshotID(docID: string, id: string): string {
  const payload = Buffer.from(JSON.stringify({ docID, id }), 'utf8').toString('base64url')
  return `${payload}${SUFFIX}`
}

export function decodeSnapshotID(value: string): DecodedSnapshotID | undefined {
  if (!value.endsWith(SUFFIX)) {
    return undefined
  }
  const payload = value.slice(0, -SUFFIX.length)
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof decoded?.docID === 'string' && typeof decoded?.id === 'string') {
      return { docID: decoded.docID, id: decoded.id }
    }
    return undefined
  } catch {
    return undefined
  }
}
