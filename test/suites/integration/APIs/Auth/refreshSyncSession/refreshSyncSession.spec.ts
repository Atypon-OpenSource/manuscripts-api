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

import { NextFunction, Request, Response } from 'express'
import * as HttpStatus from 'http-status-codes'
import * as supertest from 'supertest'

import { AuthStrategy } from '../../../../../../src/Auth/Passport/AuthStrategy'
import { drop, seed, testDatabase, dropBucket } from '../../../../../utilities/db'
import { basicLogin, refreshSyncSessions } from '../../../../../api'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import { validUserToken } from '../../../../../data/fixtures/authServiceUser'
import { ValidHeaderWithApplicationKey, authorizationHeader } from '../../../../../data/fixtures/headers'
import { UserClaim } from '../../../../../../src/Auth/Interfaces/UserClaim'
import { SYNC_GATEWAY_COOKIE_NAME, GATEWAY_BUCKETS } from '../../../../../../src/DomainServices/Sync/SyncService'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }

beforeAll(async () => {
  db = await testDatabase()
  /*await Promise.all(
    GATEWAY_BUCKETS.map(key => {
      return DIContainer.sharedContainer.syncService.createGatewayAccount(
        'User|' + validBody.email,
        key
      )
    })
  )*/
})

async function seedAccounts () {
  await DIContainer.sharedContainer.syncService.createGatewayAccount(
      'User|' + validBody.email,
      null
    )
}

afterAll(() => db.bucket.disconnect())

xdescribe('refreshSyncSessions - POST api/v1/auth/refreshSyncSessions', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
    await seedAccounts()
  })

  test('ensures that a valid logged in user can refresh session', async () => {
    const loginResponse: supertest.Response = await basicLogin(validBody, ValidHeaderWithApplicationKey)

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const refreshResponse = await refreshSyncSessions(header)

    expect(refreshResponse.status).toBe(HttpStatus.NO_CONTENT)

    const setCookieHeaders = refreshResponse.header['set-cookie']
    expect(setCookieHeaders).toBeDefined()

    const [syncSessionCookie] = setCookieHeaders
    expect(syncSessionCookie.startsWith(SYNC_GATEWAY_COOKIE_NAME)).toBeTruthy()
  })

  test('should fail if user token not found in the database', async () => {
    const header = authorizationHeader(validUserToken.token)
    AuthStrategy.userValidationCallback = (_error: Error | null, _user: UserClaim | null, req: Request, _res: Response, next: NextFunction) => {
      req.user = {
        _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a'
      }
      return next()
    }

    const refreshResponse = await refreshSyncSessions(header)

    expect(refreshResponse.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})
