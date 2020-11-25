/*!
 * © 2020 Atypon Systems LLC
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

jest.mock('email-templates', () => jest.fn().mockImplementation(() => {
  return {
    send: jest.fn(() => Promise.resolve({})),
    render: jest.fn(() => Promise.resolve({}))
  }
}))

jest.mock('../../../../../../src/DomainServices/External/AWS', () => ({
  SES: { sendEmail: jest.fn((_foo, callback) => callback(null, { foo: 1 })) }
}))

import { drop, dropBucket, seed, testDatabase } from '../../../../../../test/utilities/db'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { TEST_TIMEOUT } from '../../../../../../test/utilities/testSetup'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { GATEWAY_BUCKETS } from '../../../../../../src/DomainServices/Sync/SyncService'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const userId = 'User|valid-user@manuscriptsapp.com'

beforeAll(async () => {
  db = await testDatabase()
  await Promise.all(
    GATEWAY_BUCKETS.map(key => {
      return DIContainer.sharedContainer.syncService.createGatewayAccount(
        userId,
        key
      )
    })
  )
})
afterAll(() => db.bucket.disconnect())

describe('UserService - clearUsersData', () => {
  beforeEach(async () => {
    const seedOptions: SeedOptions = {
      users: true,
      applications: true,
      projects: true
    }

    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should clear users data when deleteAt date passed.', async () => {
    const userService = DIContainer.sharedContainer.userService
    const userRepository = DIContainer.sharedContainer.userRepository
    const user = await userRepository.getById(userId)

    expect(user!._id).toEqual(userId)
    await userRepository.patch(userId, { deleteAt: 1518357671 }, {})

    const updatedUser = await userRepository.getById(userId)

    expect(updatedUser!.deleteAt).toEqual(1518357671)
    expect(await userRepository.getUsersToDelete()).toHaveLength(1)

    await userService.clearUsersData()
    const deletedUser = await userRepository.getById(userId)

    expect(deletedUser).toBeNull()
  })

  test('should not complain if clearUsersData called multiple times', async () => {
    const userService = DIContainer.sharedContainer.userService
    const userRepository = DIContainer.sharedContainer.userRepository
    const user = await userRepository.getById(userId)

    expect(user!._id).toEqual(userId)
    await userRepository.patch(userId, { deleteAt: 1518357671 }, {})

    const updatedUser = await userRepository.getById(userId)

    expect(updatedUser!.deleteAt).toEqual(1518357671)
    expect(await userRepository.getUsersToDelete()).toHaveLength(1)

    await userService.clearUsersData()
    await userService.clearUsersData()

    const deletedUser = await userRepository.getById(userId)

    expect(deletedUser).toBeNull()
  })
})
