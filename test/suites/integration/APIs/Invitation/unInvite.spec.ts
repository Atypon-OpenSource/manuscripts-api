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

import { uninvite, basicLogin } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { GATEWAY_BUCKETS } from '../../../../../src/DomainServices/Sync/SyncService'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import {
  ValidContentTypeAcceptJsonHeader,
  ValidHeaderWithApplicationKey,
  authorizationHeader
} from '../../../../data/fixtures/headers'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'

let db: any = null
const seedOptions: SeedOptions = {
  users: true,
  applications: true,
  projects: true,
  projectInvitations: true
}

beforeAll(async () => {
  db = await testDatabase()
  await Promise.all(
    GATEWAY_BUCKETS.map(key => {
      return DIContainer.sharedContainer.syncService.createGatewayAccount(
        'User|' + validBody.email,
        key
      )
    })
  )
})

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('InvitationService - uninvite', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should fail if invitation does not exist', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await uninvite(
      { invitationId: 'MPContainerInvitation:invalid-invitation-id' },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      }
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if project does not exist', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)

    const invitationTupleHash = checksum(
      'valid-user@manuscriptsapp.com-valid-user-4@manuscriptsapp.com-not-valid-project-id',
      { algorithm: 'sha1' }
    )
    const response: supertest.Response = await uninvite(
      { invitationId: `MPContainerInvitation:${invitationTupleHash}` },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      }
    )

    expect(response.status).toBe(HttpStatus.NOT_FOUND)
  })

  test('user can not uninvite others if he is not a project owner', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)

    const invitationTupleHash = checksum(
      'valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-valid-project-id',
      { algorithm: 'sha1' }
    )
    const response: supertest.Response = await uninvite(
      { invitationId: `MPContainerInvitation:${invitationTupleHash}` },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      }
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('project owner successfully uninvite other user', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)

    const invitationTupleHash = checksum(
      'valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-valid-project-id-2',
      { algorithm: 'sha1' }
    )
    const response: supertest.Response = await uninvite(
      { invitationId: `MPContainerInvitation:${invitationTupleHash}` },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })
})
