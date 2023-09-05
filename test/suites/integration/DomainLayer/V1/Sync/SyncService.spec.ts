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

import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { SyncService } from '../../../../../../src/DomainServices/Sync/SyncService'
import { drop, dropBucket, seed, testDatabase } from '../../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = { users: true }

beforeAll(async () => (db = await testDatabase()))
afterAll(() => db.bucket.disconnect())

const userId = 'User|valid-user@manuscriptsapp.com'

describe('SyncService', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
  })

  test('should create a gateway account', async () => {
    const syncService = DIContainer.sharedContainer.syncService
    const userStatus = await syncService.getOrCreateUserStatus(userId)

    expect(userStatus._id).toEqual('UserStatus|User|valid-user@manuscriptsapp.com')
  })

  test('should successfully create a UserProfile', () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(
      syncService.createUserProfile({
        _id: 'User|1',
        name: 'Foo Bar',
        email: 'sads@example.com',
      } as any)
    ).resolves.not.toBeUndefined()
  })

  test('should successfully create a UserProfile with no name', () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(
      syncService.createUserProfile({
        _id: 'User|1',
        name: '',
        email: 'sads',
      } as any)
    ).resolves.not.toBeUndefined()
  })

  test('should fail to remove a user which does not exist in gateway', () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.removeUserStatus('User|doesnt-exist')).rejects.toThrow(Error)
  })

  test('should be alive :p', async () => {
    return expect(SyncService.isAlive()).resolves.toBeTruthy()
  })
})
