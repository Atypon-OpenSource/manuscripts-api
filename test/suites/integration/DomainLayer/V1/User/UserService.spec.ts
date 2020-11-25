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

import { drop, dropBucket, seed, testDatabase } from '../../../../../../test/utilities/db'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { TEST_TIMEOUT } from '../../../../../../test/utilities/testSetup'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { GATEWAY_BUCKETS } from '../../../../../../src/DomainServices/Sync/SyncService'
import { UserService } from '../../../../../../src/DomainServices/User/UserService'
import { ValidationError } from '../../../../../../src/Errors'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const userId = 'User|valid-user@manuscriptsapp.com'

beforeAll(async () => {
  db = await testDatabase()
  await Promise.all(
    GATEWAY_BUCKETS.map((key) => {
      return DIContainer.sharedContainer.syncService.createGatewayAccount(
        userId,
        key
      )
    })
  )
})
afterAll(() => db.bucket.disconnect())

describe('UserService - deleteUser', () => {
  beforeEach(async () => {
    const seedOptions: SeedOptions = {
      users: true,
      applications: true,
      projects: true,
      projectInvitations: true
    }

    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should throw error if user not found', async () => {
    const userService = DIContainer.sharedContainer.userService
    return expect(
      userService.deleteUser('User|not-found-user@manuscriptsapp.com')
    ).rejects.toThrow()
  })

  test('should delete user data', async () => {
    const userService = DIContainer.sharedContainer.userService
    const userRepository = DIContainer.sharedContainer.userRepository
    const user = await userRepository.getById(userId)

    expect(user!._id).toEqual(userId)

    await userService.deleteUser(userId)
    const deletedUser = await userRepository.getById(userId)

    expect(deletedUser).toBeNull()
  })
})

describe('UserService - removeUserIDPrefix', () => {
  test("should remove User| or User_ from user's id", () => {
    expect(UserService.removeUserIDPrefix('User|test')).toEqual('test')
    expect(UserService.removeUserIDPrefix('User_test')).toEqual('test')
  })

  test('should fail if the user does not have a valid prefix', () => {
    expect(() => UserService.removeUserIDPrefix('test')).toThrowError(
      ValidationError
    )
  })
})
