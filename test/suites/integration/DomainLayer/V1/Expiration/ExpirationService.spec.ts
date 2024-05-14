/*!
 * © 2022 Atypon Systems LLC
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

import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { UserActivityEventType } from '../../../../../../src/Models/UserEventModels'
import { invitationsList } from '../../../../../data/dump/invitation'
import { projectInvitationsList } from '../../../../../data/dump/projectInvitation'
import { validUser1 } from '../../../../../data/fixtures/UserRepository'
import { drop, seed, testDatabase } from '../../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = {
  userTokens: true,
  invitationTokens: true,
  invitations: true,
  projectInvitations: true,
}
beforeAll(async () => (db = await testDatabase(true)))
afterAll(() => db.bucket.disconnect())

describe('Expiration', () => {
  beforeEach(async () => {
    await drop()
    await seed(seedOptions)
  })

  test('should delete expired userEvents', async () => {
    const expirationService = DIContainer.sharedContainer.expirationService
    const activityTrackingService = DIContainer.sharedContainer.activityTrackingService
    activityTrackingService.createEvent(
      validUser1._id,
      UserActivityEventType.SuccessfulLogin,
      'deviceId'
    )
    await activityTrackingService.awaitCreation()

    const userEventRepository = DIContainer.sharedContainer.userEventRepository
    const userEvent = (await userEventRepository.getOne({ userId: validUser1._id })) as any
    expect(userEvent).toBeDefined()

    await userEventRepository.touch(userEvent._id, new Date().getTime() + 10000000)
    await expirationService.clearExpiredDocuments()
    const userEventAfter = await userEventRepository.getOne({ userId: validUser1._id })
    expect(userEventAfter).toBeDefined()

    await userEventRepository.touch(userEvent._id, 0)
    await expirationService.clearExpiredDocuments()
    const userEventExpired = await userEventRepository.getOne({ userId: validUser1._id })
    expect(userEventExpired).toBeNull()
  })

  test('should delete expired userTokens', async () => {
    const expirationService = DIContainer.sharedContainer.expirationService
    const userTokenRepository = DIContainer.sharedContainer.userTokenRepository
    const userToken = (await userTokenRepository.getOne({})) as any
    expect(userToken).toBeDefined()

    await userTokenRepository.touch(userToken._id, new Date().getTime() + 10000000)
    await expirationService.clearExpiredDocuments()
    const userTokenAfter = await userTokenRepository.getOne({ _id: userToken._id })
    expect(userTokenAfter).toBeDefined()

    await userTokenRepository.touch(userToken._id, 0)
    await expirationService.clearExpiredDocuments()
    const userTokenExpired = await userTokenRepository.getOne({ _id: userToken._id })
    expect(userTokenExpired).toBeNull()
  })

  test('should delete expired invitationTokens', async () => {
    const expirationService = DIContainer.sharedContainer.expirationService
    const invitationTokenRepository = DIContainer.sharedContainer.invitationTokenRepository
    const invitationToken = (await invitationTokenRepository.getOne({})) as any
    expect(invitationToken).toBeDefined()

    await invitationTokenRepository.touch(invitationToken._id, new Date().getTime() + 10000000)
    await expirationService.clearExpiredDocuments()
    const invitationTokenAfter = await invitationTokenRepository.getOne({
      _id: invitationToken._id,
    })
    expect(invitationTokenAfter).toBeDefined()

    await invitationTokenRepository.touch(invitationToken._id, 0)
    await expirationService.clearExpiredDocuments()
    const invitationTokenExpired = await invitationTokenRepository.getOne({
      _id: invitationToken._id,
    })
    expect(invitationTokenExpired).toBeNull()
  })

  test('should delete expired invitations', async () => {
    const expirationService = DIContainer.sharedContainer.expirationService
    const invitationRepository = DIContainer.sharedContainer.invitationRepository
    const invitation = (await invitationRepository.getById(invitationsList[0]._id)) as any
    expect(invitation).toBeDefined()

    await invitationRepository.touch(invitation._id, new Date().getTime() + 10000000)
    await expirationService.clearExpiredDocuments()
    const invitationAfter = await invitationRepository.getById(invitation._id)
    expect(invitationAfter).toBeDefined()

    await invitationRepository.touch(invitation._id, 0)
    await expirationService.clearExpiredDocuments()
    const invitationExpired = await invitationRepository.getById(invitation._id)
    expect(invitationExpired).toBeNull()
  })

  test('should delete expired projectInvitations', async () => {
    const expirationService = DIContainer.sharedContainer.expirationService
    const containerInvitationRepository = DIContainer.sharedContainer.containerInvitationRepository
    const projectInvitation = (await containerInvitationRepository.getById(
      projectInvitationsList[0]._id
    )) as any
    expect(projectInvitation).toBeDefined()

    await containerInvitationRepository.touch(
      projectInvitation._id,
      new Date().getTime() + 10000000
    )
    await expirationService.clearExpiredDocuments()
    const projectInvitationAfter = await containerInvitationRepository.getById(
      projectInvitation._id
    )
    expect(projectInvitationAfter).toBeDefined()

    await containerInvitationRepository.touch(projectInvitation._id, 0)
    await expirationService.clearExpiredDocuments()
    const projectInvitationExpired = await containerInvitationRepository.getById(
      projectInvitation._id
    )
    expect(projectInvitationExpired).toBeNull()
  })
})
