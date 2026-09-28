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
import { getVersion } from '@manuscripts/transform'

import { DIContainer } from '../../DIContainer/DIContainer'

export const V3_SENTINEL_MANUSCRIPT_ID = 'v3'

export type V3Route = { proxied: true; docID: string; schemaVersion: string } | { proxied: false }

// manuscriptID === 'v3' means projectID is itself a raw v3 docID — decided by
// the URL shape alone, so this never touches Prisma for that case (a
// genuinely new v3-native document may not even have a local row to find).
//
// Uses findRoutingInfo (a lightweight, no-write lookup), not findDocument:
// findDocument loads the full doc/steps/snapshots and runs maybeMigrate,
// which can write a MigrationBackup row and rewrite `doc` as a side effect
// — unacceptable for a check that runs before authorization, on every
// request, including ones the caller may not even be allowed to make.
export async function resolveV3Route(projectID: string, manuscriptID: string): Promise<V3Route> {
  if (manuscriptID === V3_SENTINEL_MANUSCRIPT_ID) {
    return { proxied: true, docID: projectID, schemaVersion: getVersion() }
  }
  const routingInfo = await DIContainer.sharedContainer.documentClient.findRoutingInfo(
    manuscriptID
  )
  if (routingInfo.migratedToV3) {
    return {
      proxied: true,
      docID: `${projectID}#${manuscriptID}`,
      schemaVersion: routingInfo.schema_version ?? getVersion(),
    }
  }
  return { proxied: false }
}
