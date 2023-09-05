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
import { UserActivityEventType } from '../../../../../../src/Models/UserEventModels'
import { validUser1 } from '../../../../../data/fixtures/UserRepository'
import { drop, dropBucket, seed, testDatabase } from '../../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = {}

beforeAll(async () => (db = await testDatabase(false)))
afterAll(() => db.bucket.disconnect())

describe('UserActivityTrackingService', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
  })

  test('should not create event because the eventTrackingService is disabled', async () => {
    const activityTrackingService = DIContainer.sharedContainer.activityTrackingService
    activityTrackingService.createEvent(
      validUser1._id,
      UserActivityEventType.SuccessfulLogin,
      'appId',
      'deviceId'
    )
    await activityTrackingService.awaitCreation()

    const eventRepository = DIContainer.sharedContainer.userEventRepository
    const userEvent = await eventRepository.getOne({ userId: validUser1._id })

    expect(userEvent).toBeNull()
  })
})
