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

const documentQuery = `UPDATE manuscriptDoc
                       SET user_model_id = REPLACE(user_model_id, '|', '_')
                       WHERE user_model_id LIKE 'User|%';
                       `

const userQuery = `UPDATE "User"
                   SET
                    "id" = REPLACE("id", '|', '_'),
                    "given" = SPLIT_PART(data->>'name', ' ', 1),
                    "family" = SPLIT_PART(data->>'name', ' ', 2),
                    "connectUserID" = data->>'connectUserID',
                    "email" = data->>'email'
                   WHERE
                   "id" LIKE 'User|%'`
                   
async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(documentQuery)
    await tx.$executeRaw(userQuery)
  })
}
main()
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
