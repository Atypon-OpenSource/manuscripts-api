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

import { basicLogin, changePassword } from '../../../../../api'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { drop, seed, testDatabase, dropBucket } from '../../../../../utilities/db'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import {
  ValidHeaderWithApplicationKey,
  authorizationHeader,
  ValidContentTypeAcceptJsonHeader
} from '../../../../../data/fixtures/headers'

import { GATEWAY_BUCKETS } from '../../../../../../src/DomainServices/Sync/SyncService'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }

beforeAll(async () => {
  db = await testDatabase()
  await Promise.all(GATEWAY_BUCKETS.map(key => {
    return DIContainer.sharedContainer.syncService.createGatewayAccount('User|' + validBody.email, key)
  }))
})

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('change Password - POST api/v1/auth/changePassword', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should change the user password', async () => {

    const loginResponse: supertest.Response = await basicLogin(validBody, ValidHeaderWithApplicationKey)

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await changePassword({ currentPassword: '12345', newPassword: '12345678', deviceId: '9f338224-b0d5-45aa-b02c-21c7e0c3c07b' },{
      ...ValidContentTypeAcceptJsonHeader,
      ...header
    })

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should fail if password does not match', async () => {

    const loginResponse: supertest.Response = await basicLogin(validBody, ValidHeaderWithApplicationKey)

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await changePassword({ currentPassword: '123', newPassword: '12345678', deviceId: '9f338224-b0d5-45aa-b02c-21c7e0c3c07b' },{
      ...ValidContentTypeAcceptJsonHeader,
      ...header
    })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})
