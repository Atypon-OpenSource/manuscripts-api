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
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import {
  ValidContentTypeAcceptJsonHeader,
  ValidHeaderWithApplicationKey,
  authorizationHeader
} from '../../../../data/fixtures/headers'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { createProjectInvitation, createProject } from '../../../../data/fixtures/misc'

let db: any = null
const seedOptions: SeedOptions = {
  users: true,
  applications: true,
}

beforeAll(async () => {
  db = await testDatabase()
})

async function seedAccounts () {
  await DIContainer.sharedContainer.syncService.createGatewayAccount(
      'User|' + validBody.email
    )
}

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('InvitationService - uninvite', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
    await seedAccounts()
  })

  test('project owner successfully uninvite other user', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)

    const invitationTupleHash = 'MPContainerInvitation:' + checksum(
      'valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-valid-project-id-2',
      { algorithm: 'sha1' }
    )
    await createProject('MPProject:valid-project-id-2')
    await createProjectInvitation(invitationTupleHash)
    const response: supertest.Response = await uninvite(
      { invitationId: invitationTupleHash },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })
})
