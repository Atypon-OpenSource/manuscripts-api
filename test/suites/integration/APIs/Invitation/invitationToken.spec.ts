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

import {
  basicLogin,
  requestInvitationToken,
  refreshInvitationToken
} from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import {
  ValidContentTypeAcceptJsonHeader,
  ValidHeaderWithApplicationKey,
  authorizationHeader
} from '../../../../data/fixtures/headers'

import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'

let db: any = null
const seedOptions: SeedOptions = {
  users: true,
  projects: true,
  invitationTokens: true,
  applications: true
}

beforeAll(async () => {
  db = await testDatabase()
})

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('InvitationService - requestInvitationToken', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should create invitation token ', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await requestInvitationToken(header, {
      containerID: 'MPProject:valid-project-id-2',
      role: 'Writer'
    })
    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should extends invitation token expiry if token already exists ', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await requestInvitationToken(header, {
      containerID: 'MPProject:valid-project-id-5',
      role: 'Viewer'
    })
    expect(response.status).toBe(HttpStatus.OK)
  })
})

describe('InvitationService - refreshProjectInvitationToken', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should refresh invitation token ', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await refreshInvitationToken(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      },
      {
        containerID: 'MPProject:valid-project-id-5',
        role: 'Viewer'
      }
    )
    expect(response.status).toBe(HttpStatus.OK)
  })
})
