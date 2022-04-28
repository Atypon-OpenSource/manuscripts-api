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

import { drop, seed, testDatabase, dropBucket } from '../../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { validUser1, validUser2 } from '../../../../../data/fixtures/UserRepository'
import { UserActivityEventType } from '../../../../../../src/Models/UserEventModels'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = {}
beforeAll(async () => db = await testDatabase(true))
afterAll(() => db.bucket.disconnect())

describe('UserActivityTrackingService', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
  })

  test('should create event successfully', async () => {
    const activityTrackingService = DIContainer.sharedContainer.activityTrackingService
    activityTrackingService.createEvent(validUser1._id, UserActivityEventType.SuccessfulLogin, 'appId', 'deviceId')
    await activityTrackingService.awaitCreation()

    const eventRepository = DIContainer.sharedContainer.userEventRepository
    const userEvent = await eventRepository.getOne({ userId: validUser1._id })

    expect((userEvent as any).eventType).toBe(UserActivityEventType.SuccessfulLogin)
  })

  test('should create more than one event successfully', async () => {
    const activityTrackingService = DIContainer.sharedContainer.activityTrackingService

    await activityTrackingService.awaitCreation()

    activityTrackingService.createEvent(validUser1._id, UserActivityEventType.SuccessfulLogin, 'appId', 'deviceId')
    activityTrackingService.createEvent(validUser2._id, UserActivityEventType.Logout, 'appId', 'deviceId')
    await activityTrackingService.awaitCreation()

    const eventRepository = DIContainer.sharedContainer.userEventRepository
    const user1Event = await eventRepository.getOne({ userId: validUser1._id })
    const user2Event = await eventRepository.getOne({ userId: validUser2._id })

    expect((user1Event as any).eventType).toBe(UserActivityEventType.SuccessfulLogin)
    expect((user2Event as any).eventType).toBe(UserActivityEventType.Logout)
  })

  test('should fail to create an event because an error occurred', async () => {
    const activityTrackingService = DIContainer.sharedContainer.activityTrackingService
    activityTrackingService.createEvent(undefined as any, UserActivityEventType.SuccessfulLogin, 'appId', 'deviceId')
    await activityTrackingService.awaitCreation()

    const eventRepository = DIContainer.sharedContainer.userEventRepository
    const userEvent = await eventRepository.getOne({ userId: validUser1._id })

    expect(userEvent).toBeNull()
  })

  test('should fail to create an event because an error occurred when other events are creating', async () => {
    const activityTrackingService = DIContainer.sharedContainer.activityTrackingService
    activityTrackingService.createEvent(validUser1._id, UserActivityEventType.SuccessfulLogin, 'appId', 'deviceId')
    activityTrackingService.createEvent(undefined as any, UserActivityEventType.SuccessfulLogin, 'appId', 'deviceId')
    await activityTrackingService.awaitCreation()

    const eventRepository = DIContainer.sharedContainer.userEventRepository
    const userEvent = await eventRepository.getOne({ userId: validUser1._id })

    expect((userEvent as any).eventType).toBe(UserActivityEventType.SuccessfulLogin)
  })
})
