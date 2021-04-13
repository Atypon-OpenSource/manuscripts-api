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

jest.mock('email-templates', () => jest.fn().mockImplementation(() => {
  return {
    send: jest.fn(() => Promise.resolve({})),
    render: jest.fn(() => Promise.resolve({}))
  }
}))

jest.mock('../../../../../src/DomainServices/External/AWS', () => ({
  SES: { sendEmail: jest.fn((_foo, callback) => callback(null, { foo: 1 })) }
}))

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { connectSignup, signup, verify } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import { invalidNewUserCredentials, validNotVerifiedNewUserCredentials } from '../../../../data/fixtures/registrationCredentials'
import { ValidContentTypeAcceptJsonHeader, ValidHeaderWithApplicationKey } from '../../../../data/fixtures/headers'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import { GATEWAY_BUCKETS } from '../../../../../src/DomainServices/Sync/SyncService'

let db: any = null
const seedOptions: SeedOptions = { users: true, singleUseTokens: true, applications: true }

beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

jest.setTimeout(TEST_TIMEOUT)

describe('UserRegistrationService - signup', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })
  test('should fail if user status does not exist', async () => {
    await DIContainer.sharedContainer.userStatusRepository.remove(null)
    const response: supertest.Response = await signup(
        invalidNewUserCredentials ,
        ValidContentTypeAcceptJsonHeader
      )

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should fail if verified user exists', async () => {
    const response: supertest.Response = await signup(
      invalidNewUserCredentials,
      ValidContentTypeAcceptJsonHeader
    )
    expect(response.status).toBe(HttpStatus.CONFLICT)
    expect(response.body).toMatchSnapshot()
  })

  test('should fail if not verified user exists', async () => {

    const response: supertest.Response = await signup(
      validNotVerifiedNewUserCredentials,
      ValidContentTypeAcceptJsonHeader
    )
    expect(response.status).toBe(HttpStatus.CONFLICT)
  })
})

describe('UserRegistrationService - verify', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should fail if token is empty', async () => {
    const body = {
      token: ''
    }
    const response: supertest.Response = await verify(body)

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if token is not in db', async () => {
    const body = {
      token: 'not-in-db'
    }
    const response: supertest.Response = await verify(body)

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should verify user if token is valid', async () => {
    const body = {
      token: 'SingleUseToken|foobarbaz2'
    }
    const response: supertest.Response = await verify(body)

    expect(response.status).toBe(HttpStatus.NO_CONTENT)
  })
})

describe('UserRegistrationService - connectSignup', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
    return Promise.all(
        GATEWAY_BUCKETS.map(key => {
          return DIContainer.sharedContainer.syncService.createGatewayAccount(
              'User|' + validBody.email,
              key
          )
        })
    )
  })
  test('should fail if user email already exists', async () => {
    const response: supertest.Response = await connectSignup(
      {
        email: validBody.email,
        name: 'validName',
        connectUserID: 'validConnectId'
      }, {
        ...ValidHeaderWithApplicationKey
      }
    )
    expect(response.status).toBe(HttpStatus.CONFLICT)
  })
})
