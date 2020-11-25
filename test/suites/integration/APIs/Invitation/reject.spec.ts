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

import * as HttpStatus from 'http-status-codes'
import * as supertest from 'supertest'
import checksum from 'checksum'

import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import { ValidContentTypeAcceptJsonHeader } from '../../../../data/fixtures/headers'
import { InvitationRepository } from '../../../../../src/DataAccess/InvitationRepository/InvitationRepository'
import { reject } from '../../../../api'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'

let db: any = null

beforeAll(async () => {
  db = await testDatabase()
})

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('InvitationService - reject', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ invitations: true })
  })

  test('should reject invitation successfully', async () => {
    const invitationRepository = new InvitationRepository(BucketKey.Data, db)
    const hash = checksum(
      'valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com',
      { algorithm: 'sha1' }
    )
    const rejectResponse: supertest.Response = await reject(
      { invitationId: `MPInvitation:${hash}` },
      {
        ...ValidContentTypeAcceptJsonHeader
      }
    )
    expect(rejectResponse.status).toBe(HttpStatus.OK)
    const invitation = await invitationRepository.getById(
      `MPInvitation:${hash}`
    )

    expect(invitation).toBeNull()
  })

  test('should fail if invitation does not exist', async () => {
    const rejectResponse: supertest.Response = await reject(
      { invitationId: 'MPInvitation:invalid-invitation-id' },
      {
        ...ValidContentTypeAcceptJsonHeader
      }
    )
    expect(rejectResponse.status).toBe(HttpStatus.BAD_REQUEST)
  })
})

describe('InvitationService - rejectProjectInvite', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projectInvitations: true })
  })

  test('should reject invitation successfully', async () => {
    const invitationTupleHash = checksum(
      'valid-user@manuscriptsapp.com-valid-user-4@manuscriptsapp.com-valid-project-id-2',
      { algorithm: 'sha1' }
    )
    const rejectResponse: supertest.Response = await reject(
      { invitationId: `MPContainerInvitation:${invitationTupleHash}` },
      {
        ...ValidContentTypeAcceptJsonHeader
      }
    )
    expect(rejectResponse.status).toBe(HttpStatus.OK)
  })

  test('should fail if invitation does not exist', async () => {
    const rejectResponse: supertest.Response = await reject(
      { invitationId: 'MPContainerInvitation:invalid-invitation-id' },
      {
        ...ValidContentTypeAcceptJsonHeader
      }
    )
    expect(rejectResponse.status).toBe(HttpStatus.BAD_REQUEST)
  })
})
