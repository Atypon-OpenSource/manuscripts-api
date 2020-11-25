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

jest.mock('email-templates', () =>
  jest.fn().mockImplementation(() => {
    return {
      send: jest.fn(() => Promise.reject(new Error('Fake simulated email-templates send() failure.'))),
      render: jest.fn(() => Promise.reject(new Error('Fake simulated email-templates render() failure.')))
    }
  })
)

jest.mock('../../../../../src/DomainServices/External/AWS', () => ({
  SES: { sendEmail: jest.fn((_foo, callback) => callback(null, { foo: 1 })) }
}))

import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import { markUserForDeletion, basicLogin } from '../../../../api'
import {
  ValidContentTypeAcceptJsonHeader,
  authorizationHeader,
  ValidHeaderWithApplicationKey
} from '../../../../data/fixtures/headers'

import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { GATEWAY_BUCKETS } from '../../../../../src/DomainServices/Sync/SyncService'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
const seedOptions: SeedOptions = { users: true, applications: true }

let db: any = null

beforeAll(async () => {
  db = await testDatabase()
})

afterAll(async () => db.bucket.disconnect())

describe('UserService - markUserForDeletion', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
    await Promise.all(GATEWAY_BUCKETS.map(key => {
      return DIContainer.sharedContainer.syncService.createGatewayAccount('User|' + validBody.email, key)
    }))
  })

  test('if markUserForDeletion fails to send email, it should 500', async () => {
    const loginResponse: supertest.Response = await basicLogin(validBody, ValidHeaderWithApplicationKey)
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await markUserForDeletion(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      }
    )

    expect([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR].indexOf(response.status) >= 0).toBeTruthy()
  })
})
