/*!
 * © 2024 Atypon Systems LLC
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
import { PrismaClient } from '@prisma/client'
import { JsonObject } from 'prisma/prisma-client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  await prisma.$transaction(async (tx) => {
    const documents = await tx.manuscriptDoc.findMany()
    for (const document of documents) {
      const histories = await tx.manuscriptDocHistory.findMany({
        where: {
          doc_id: document.manuscript_model_id,
          version: {
            gt: 0,
          },
        },
        orderBy: {
          version: 'asc',
        },
      })
      const updatedSteps: JsonObject[] = []
      for (const history of histories) {
        const steps = history.steps as JsonObject[]
        steps.forEach((step) => {
          if (step && typeof step === 'object') {
            updatedSteps.push({ ...step, clientID: history.client_id })
          }
        })
      }
      await tx.manuscriptDoc.update({
        where: {
          manuscript_model_id: document.manuscript_model_id,
        },
        data: {
          steps: updatedSteps,
          user_model_id: document.user_model_id.replace('|', '_'),
        },
      })
    }
  })
}
// eslint-disable-next-line promise/catch-or-return
main()
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => await prisma.$disconnect())
