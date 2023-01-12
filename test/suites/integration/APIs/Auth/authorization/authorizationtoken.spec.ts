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

import { StatusCodes } from 'http-status-codes'
import * as supertest from 'supertest'

import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { authorizationToken } from '../../../../../api'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import {
  authorizationHeader,
  ValidContentTypeAcceptJsonHeader,
  ValidHeaderWithApplicationKey,
} from '../../../../../data/fixtures/headers'
import { drop, dropBucket, seed, testDatabase } from '../../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }

beforeAll(async () => {
  db = await testDatabase()
  await DIContainer.sharedContainer.syncService.getOrCreateUserStatus('User|' + validBody.email)
})

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('authorization scope - GET api/v1/authorization/:scope', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
  })

  test('should generate an authorization token', async () => {
    const loginResponse = await basicLogin(validBody, ValidHeaderWithApplicationKey)
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await authorizationToken(
      { ...header, ...ValidContentTypeAcceptJsonHeader },
      {
        scope: 'jupyterhub',
      }
    )

    expect(response.status).toBe(StatusCodes.OK)
  })

  test('should barr unauthorized user', async () => {
    const loginResponse = await basicLogin(validBody, ValidHeaderWithApplicationKey)
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const response: supertest.Response = await authorizationToken(
      { ...ValidContentTypeAcceptJsonHeader },
      {
        scope: 'jupyterhub',
      }
    )

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })

  test('should fail on invalid scope', async () => {
    const loginResponse = await basicLogin(validBody, ValidHeaderWithApplicationKey)
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await authorizationToken(
      { ...header, ...ValidContentTypeAcceptJsonHeader },
      {
        scope: 'invalid_scope',
      }
    )

    expect(response.status).toBe(StatusCodes.BAD_REQUEST)
  })
})
