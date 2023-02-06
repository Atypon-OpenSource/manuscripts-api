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

import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { ContainerInvitationRepository } from '../../../../../src/DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { validProjectInvitationObject } from '../../../../data/fixtures/invitation'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase(false, BucketKey.Project)))
afterAll(() => db.bucket.disconnect())

describe('ContainerInvitationRepository getInvitationsForUser', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projectInvitations: true })
  })

  test('should get project invitation by id', async () => {
    const repository = new ContainerInvitationRepository(BucketKey.Project, db)

    const invitations: any = await repository.getInvitationsForUser(
      validProjectInvitationObject.containerID,
      validProjectInvitationObject.invitedUserEmail
    )
    expect(invitations[0]._id).toBe(validProjectInvitationObject._id)
  })
})

describe('InvitationRepository getAllByEmail', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projectInvitations: true })
  })

  test('should get all invitations by email', async () => {
    const repository = new ContainerInvitationRepository(BucketKey.Project, db)

    const invitations: any = await repository.getAllByEmail('valid-google@manuscriptsapp.com')

    expect(invitations[0]).toBeDefined()
  })
})

describe('InvitationRepository removeByUserIdAndEmail', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projectInvitations: true })
  })

  test('should remove all invitations by email', async () => {
    const repository = new ContainerInvitationRepository(BucketKey.Project, db)

    await repository.removeByUserIdAndEmail(
      validProjectInvitationObject.invitingUserID,
      'valid-google@manuscriptsapp.com'
    )

    const invitations: any = await repository.getAllByEmail('valid-google@manuscriptsapp.com')

    expect(invitations.length).toEqual(0)
  })
})
