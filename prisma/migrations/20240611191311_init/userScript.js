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
function splitName(name) {
  const trimmedName = name.trim()
  const nameParts = trimmedName.split(' ')
  if (nameParts.length === 1) {
    return { given: nameParts[0], family: '' }
  } else {
    return { given: nameParts[0], family: nameParts[nameParts.length - 1] }
  }
}

async function main() {
  console.log('starting users script..')
  await prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({
      where: {
        id: {
          startsWith: 'User|',
        },
      },
    })
    for (const user of users) {
      const data = user.data
      if (data && 'name' in data && 'email' in data && 'connectUserID' in data) {
        const newID = user.id.replace('|', '_')
        const name = data.name 
        const { given, family } = splitName(name)
        const connectUserID = data.connectUserID 
        const email = data.email 
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
          },
        })
        console.log(`user updated: ${user.id} -> ${newID}`)
      }
    }
  }, {timeout: 600000})
}
// eslint-disable-next-line promise/catch-or-return
main()
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () =>{ await prisma.$disconnect() 
    console.log('done with users')
  })