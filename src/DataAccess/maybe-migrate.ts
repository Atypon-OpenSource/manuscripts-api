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
import { ManuscriptDoc, Prisma } from '@prisma/client'
import { cloneDeep } from 'lodash'

async function maybeMigrate<T extends ManuscriptDoc>(
  row: T,
  tx: Prisma.TransactionClient
): Promise<T> {
  const { manuscript_model_id, user_model_id, project_model_id, doc, schema_version } = row
  const currentVersion = getVersion()

  if (!schema_version || !doc || typeof doc !== 'object' || schema_version === currentVersion) {
    return row
  }

  const migratedDoc = migrateFor(cloneDeep(doc as JSONProsemirrorNode), schema_version)

  await tx.migrationBackup.create({
    data: {
      manuscript_model_id,
      user_model_id,
      project_model_id,
      schema_version,
      doc: doc as Prisma.JsonObject,
      version: 0,
    },
  })

  await tx.manuscriptDoc.update({
    where: { manuscript_model_id },
    data: {
      doc: migratedDoc as unknown as Prisma.JsonObject,
      schema_version: currentVersion,
    },
  })

  return { ...row, doc: migratedDoc, schema_version: currentVersion }
}

export default maybeMigrate
