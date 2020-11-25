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

import {
  drop,
  dropBucket,
  seed,
  testDatabase
} from '../../../../../utilities/db'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { GATEWAY_BUCKETS } from '../../../../../../src/DomainServices/Sync/SyncService'

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

describe('ContainerInvitationService - updateInvitedUserID', () => {
  beforeEach(async () => {
    const seedOptions: SeedOptions = {
      projectInvitations: true
    }

    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should patch user id every invitation with the specified the user email', async () => {
    const invitationService =
      DIContainer.sharedContainer.containerInvitationService

    await invitationService.updateInvitedUserID(
      'User_valid-google@manuscriptsapp.com',
      'valid-google@manuscriptsapp.com'
    )

    const invitations = await DIContainer.sharedContainer.containerInvitationRepository.getAllByEmail(
      'valid-google@manuscriptsapp.com'
    )

    return expect(invitations[0].invitedUserID).toBe(
      'User_valid-google@manuscriptsapp.com'
    )
  })
})
