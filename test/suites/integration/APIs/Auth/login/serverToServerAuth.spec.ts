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
import * as jsonwebtoken from 'jsonwebtoken'
import * as _ from 'lodash'
import { Chance } from 'chance'

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  SYNC_GATEWAY_COOKIE_NAME
} from '../../../../../../src/DomainServices/Sync/SyncService'
import {
  drop,
  seed,
  testDatabase,
  dropBucket
} from '../../../../../utilities/db'
import {
  serverToServerAuth,
  serverToServerTokenAuth
} from '../../../../../api'
import {
  validBody,
  validEmailBody
} from '../../../../../data/fixtures/credentialsRequestPayload'
import {
  ValidHeaderWithApplicationKey
} from '../../../../../data/fixtures/headers'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { config } from '../../../../../../src/Config/Config'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)

const chance = new Chance()
let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }
const existingConfig: any = _.cloneDeep(config)

beforeAll(async () => {
  db = await testDatabase()
})

async function seedAccounts () {
  await DIContainer.sharedContainer.syncService.createGatewayAccount(
      'User|' + validBody.email
    )
}

afterAll(() => db.bucket.disconnect())
afterEach(() => {
  for (const key in existingConfig) {
    const c: any = config
    c[key] = _.cloneDeep(existingConfig[key])
  }
})

describe('Server to Server Auth - POST api/v1/auth/admin', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
    await seedAccounts()
  })

  test('ensures admin can log in with email', async () => {
    const response: supertest.Response = await serverToServerAuth(
      { deviceId: chance.guid() },
      {
        ...ValidHeaderWithApplicationKey,
        authorization: `Bearer ${jsonwebtoken.sign(
          { email: validBody.email },
          config.auth.serverSecret
        )}`
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    expect(response.body.token).toBeDefined()

    delete response.body.token
    delete response.body.refreshToken

    expect(response.body).toEqual({})
  })

  test('ensures admin can log in with email (upper case)', async () => {
    const response: supertest.Response = await serverToServerAuth(
      { deviceId: chance.guid() },
      {
        ...ValidHeaderWithApplicationKey,
        authorization: `Bearer ${jsonwebtoken.sign(
          { email: validBody.email.toUpperCase() },
          config.auth.serverSecret
        )}`
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    expect(response.body.token).toBeDefined()

    delete response.body.token
    delete response.body.refreshToken

    expect(response.body).toEqual({})
  })

  test('ensures admin can log in with connectUserID', async () => {
    const response: supertest.Response = await serverToServerAuth(
      { deviceId: chance.guid() },
      {
        ...ValidHeaderWithApplicationKey,
        authorization: `Bearer ${jsonwebtoken.sign(
          { connectUserID: 'valid-connect-user-id' },
          config.auth.serverSecret
        )}`
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    expect(response.body.token).toBeDefined()

    delete response.body.token
    delete response.body.refreshToken

    expect(response.body).toEqual({})
  })

  xtest('should set sync cookie', async () => {
    const response: supertest.Response = await serverToServerAuth(
      { deviceId: chance.guid() },
      {
        ...ValidHeaderWithApplicationKey,
        authorization: `Bearer ${jsonwebtoken.sign(
          { email: validBody.email },
          config.auth.serverSecret
        )}`
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    const setCookieHeaders = response.header['set-cookie']
    expect(setCookieHeaders).toBeDefined()
    const [syncSessionCookie] = setCookieHeaders
    expect(syncSessionCookie.startsWith(SYNC_GATEWAY_COOKIE_NAME)).toBeTruthy()
  })
})

describe('Server to Server token Auth - POST api/v1/auth/token', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
    await seedAccounts()
  })
  test('should return token', async () => {
    const createUserStatus = jest.spyOn(DIContainer.sharedContainer.userStatusRepository, 'create')
    const response: supertest.Response = await serverToServerTokenAuth(
      {
        deviceId: chance.guid()
      },
      {
        ...ValidHeaderWithApplicationKey,
        authorization: `Bearer ${jsonwebtoken.sign(
          { email: validEmailBody.email },
          config.auth.serverSecret
        )}`
      },{
        connectUserID: 'valid-connect-user-7-id'
      }
    )
    // userStatus will be created if not found
    expect(createUserStatus).toHaveBeenCalled()
    return expect(response.status).toBe(HttpStatus.OK)
  })
})
