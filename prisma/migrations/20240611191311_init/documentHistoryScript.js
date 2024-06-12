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
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

async function main() {
  console.log('starting document history script...')
  await prisma.$transaction(async (tx) => {
    const documents = await tx.manuscriptDoc.findMany({
      select: {
        manuscript_model_id: true,
        user_model_id: true
      }
    })
    let i = 0
    const documentsLength = documents.length
    for (const document of documents) {
      console.log(`updating document ${i++} of ${documentsLength}`)
      await tx.manuscriptDoc.update({
        where: {
          manuscript_model_id: document.manuscript_model_id,
        },
        data: {
          user_model_id: document.user_model_id.replace('|', '_'),
        },
      })
    }
  }, { timeout: 800000 })
}
// eslint-disable-next-line promise/catch-or-return
main()
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('done with document history')
  })
