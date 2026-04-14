/*!
 * © 2023 Atypon Systems LLC
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

import { getVersion, JSONProsemirrorNode, migrateFor } from '@manuscripts/transform'
import { Prisma } from '@prisma/client'
import { cloneDeep } from 'lodash'

import type { ManuscriptDocWithSnapshots } from '../Models/DocumentModels'

async function maybeMigrate(
  p: ManuscriptDocWithSnapshots,
  tx: Prisma.TransactionClient
): Promise<ManuscriptDocWithSnapshots> {
  const { manuscript_model_id, user_model_id, project_model_id, doc, schema_version } = p
  if (!schema_version || !doc || typeof doc !== 'object') {
    return p
  }
  const currentVersion = getVersion()
  if (schema_version === currentVersion) {
    return p
  }
  const migratedDoc = migrateFor(cloneDeep(doc as JSONProsemirrorNode), schema_version)

  // backing up old doc
  await tx.migrationBackup.create({
    data: {
      manuscript_model_id: manuscript_model_id,
      user_model_id,
      project_model_id,
      schema_version,
      doc,
      version: 0,
    },
  })

  await tx.manuscriptDoc.update({
    data: {
      doc: migratedDoc,
      schema_version: currentVersion,
    },
    where: {
      manuscript_model_id,
    },
  })

  return { ...p, doc: migratedDoc, schema_version: currentVersion } as unknown as ManuscriptDocWithSnapshots
}

export default maybeMigrate
