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

import { getVersion, migrateFor } from '@manuscripts/transform'
import { Prisma } from '@prisma/client'
import { cloneDeep } from 'lodash'

import prisma from '../../DataAccess/prismaClient'

async function maybeMigrate(
  p: {
    manuscript_model_id: string
    user_model_id: string
    project_model_id: string
    doc: Prisma.JsonValue
    schema_version: string | null
  },
  tx: Prisma.TransactionClient = prisma
) {
  const { manuscript_model_id, user_model_id, project_model_id, doc, schema_version } = p
  const migratedDoc = migrateFor(cloneDeep(doc), schema_version)

  // backing up old doc
  await tx.migrationBackup.create({
    data: {
      manuscript_model_id: manuscript_model_id,
      user_model_id,
      project_model_id,
      schema_version,
      doc: migratedDoc,
      version: 0,
    },
  })

  await tx.manuscriptDoc.update({
    data: {
      doc: migratedDoc,
      schema_version: getVersion(),
    },
    where: {
      manuscript_model_id,
    },
  })

  return { doc: migratedDoc, schema_version: getVersion() }
}

export default maybeMigrate
