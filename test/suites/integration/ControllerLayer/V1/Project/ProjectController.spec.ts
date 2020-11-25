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
      send: jest.fn(() => Promise.resolve({})),
      render: jest.fn(() => Promise.resolve({}))
    }
  })
)

jest.mock('../../../../../../src/DomainServices/External/AWS', () => ({
  SES: { sendEmail: jest.fn((_foo, callback) => callback(null, { foo: 1 })) }
}))

import {
  basicLogin,
  createProject
} from '../../../../../api'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { drop, dropBucket, seed, testDatabase } from '../../../../../utilities/db'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  ValidContentTypeAcceptJsonHeader,
  authorizationHeader,
  ValidHeaderWithApplicationKey
} from '../../../../../data/fixtures/headers'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { GATEWAY_BUCKETS } from '../../../../../../src/DomainServices/Sync/SyncService'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }

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

describe('ContainerService - createProject', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should create a project', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)

    const response: supertest.Response = await createProject(
      { ...ValidContentTypeAcceptJsonHeader, ...authHeader },
      { title: 'foo' }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })
})
