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

import { connectSignup, serverToServerAuth, signup } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import { validNewUserCredentials } from '../../../../data/fixtures/registrationCredentials'
import { SingleUseTokenQueryCriteria } from '../../../../../src/DataAccess/Interfaces/QueryCriteria'
import { SingleUseToken, SingleUseTokenType } from '../../../../../src/Models/SingleUseTokenModels'
import {
  ValidContentTypeAcceptJsonHeader,
  EmptyAcceptJsonHeader,
  EmptyContentTypeAcceptJsonHeader,
  InValidAcceptJsonHeader,
  ValidContentTypeAcceptWithCharsetJsonHeader, ValidHeaderWithApplicationKey
} from '../../../../data/fixtures/headers'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import * as jsonwebtoken from 'jsonwebtoken'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import { config } from '../../../../../src/Config/Config'
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

  test('should create user & send email if user does not exist', async () => {
    const response: supertest.Response = await signup(
        validNewUserCredentials,
        ValidContentTypeAcceptJsonHeader
      )

    expect(response.status).toBe(HttpStatus.NO_CONTENT)
  })

  test('should update token & send email if token is exist', async () => {
    const repository: any = DIContainer.sharedContainer.singleUseTokenRepository
    const token: SingleUseToken = {
      _id: 'SingleUseToken|foobarbaz',
      userId: 'User|valid-user@manuscriptsapp.com',
      tokenType: SingleUseTokenType.VerifyEmailToken,
      createdAt: new Date(1900, 1, 1).getTime(),
      updatedAt: new Date(1900, 1, 1).getTime()
    }
    repository.getOne = async (_criteria: SingleUseTokenQueryCriteria): Promise<SingleUseToken | null> => {
      return token
    }

    const response: supertest.Response = await signup(
        validNewUserCredentials,
        ValidContentTypeAcceptJsonHeader
      )

    expect(response.status).toBe(HttpStatus.NO_CONTENT)
  })

  test('should fail if email is empty', async () => {

    const response: supertest.Response = await signup(
      { name: 'valid-user-3',
        email: '',
        password: '12345678'
      },
      ValidContentTypeAcceptJsonHeader
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if password is empty', async () => {

    const response: supertest.Response = await signup(
      { name: 'valid-user-3',
        email: 'valid-user@manuscriptsapp.com',
        password: ''
      },
      ValidContentTypeAcceptJsonHeader
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if name is empty', async () => {

    const response: supertest.Response = await signup(
      { name: '',
        email: 'valid-user@manuscriptsapp.com',
        password: '12345678'
      },
      ValidContentTypeAcceptJsonHeader
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures API does not work if Content-Type & Accept headers not sent', async () => {
    const response: supertest.Response = await signup(
      validNewUserCredentials,
        EmptyContentTypeAcceptJsonHeader
      )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures API does not work if Accept header not sent', async () => {
    const response: supertest.Response = await signup(
      validNewUserCredentials,
        EmptyAcceptJsonHeader
      )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures API does not work if Accept header is invalid', async () => {
    const response: supertest.Response = await signup(
      validNewUserCredentials,
      InValidAcceptJsonHeader
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures signup API does work if Accept and Content-Type headers has charset=UTF-8', async () => {
    const response: supertest.Response = await signup(
      validNewUserCredentials,
      ValidContentTypeAcceptWithCharsetJsonHeader
    )

    expect(response.status).toBe(HttpStatus.NO_CONTENT)
  })
})

describe('ConnectSignup - signup', () => {
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
  test('should create new user', async () => {
    const loginRes: supertest.Response = await serverToServerAuth(
        { deviceId: '12345' },
      {
        ...ValidHeaderWithApplicationKey,
        authorization: `Bearer ${jsonwebtoken.sign(
            { email: validBody.email },
            config.auth.serverSecret
        )}`
      }
    )

    expect(loginRes.status).toBe(HttpStatus.OK)
    expect(loginRes.body.token).toBeDefined()
    const response: supertest.Response = await connectSignup(
      {
        email: 'someEmail@email.com',
        name: 'somename',
        connectUserID: 'someConnectID'
      },
      {
        ...ValidHeaderWithApplicationKey,
        authorization: `Bearer ${loginRes.body.token}`
      }
    )
    expect(response.status).toBe(HttpStatus.NO_CONTENT)
  })
})
