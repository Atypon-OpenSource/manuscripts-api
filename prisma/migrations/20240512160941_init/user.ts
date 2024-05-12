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
function splitName(name: string) {
  const trimmedName = name.trim()
  const nameParts = trimmedName.split(' ')
  if (nameParts.length === 1) {
    return { given: nameParts[0], family: '' }
  } else {
    return { given: nameParts[0], family: nameParts[nameParts.length - 1] }
  }
}

async function main() {
  await prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany()
    for (const user of users) {
      if (user.id.startsWith('User|' || 'User_')) {
        const data = user.data as JsonObject
        if (data && 'name' in data && 'email' in data && 'connectUserID' in data) {
          const newID = user.id.replace('|', '_')
          const name = data.name as string
          const { given, family } = splitName(name)
          const connectUserID = data.connectUserID as string
          const email = data.email as string
          await tx.user.update({
            where: {
              id: user.id,
            },
            data: {
              connectUserID,
              family,
              id: newID,
              given,
              email,
              data: undefined,
            },
          })
        }
      } else {
        await tx.user.delete({
          where: {
            id: user.id,
          },
        })
      }
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
