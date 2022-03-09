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
import { Request, Response, NextFunction } from 'express'

import {
  drop,
  seed,
  testDatabase,
  dropBucket
} from '../../../../../utilities/db'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { GATEWAY_BUCKETS } from '../../../../../../src/DomainServices/Sync/SyncService'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { backchannelLogout } from '../../../../../api'
import {
  validLogoutToken,
  invalidLogoutToken,
  validLogoutToken2
} from '../../../../../data/fixtures/logoutTokens'
import { AuthStrategy } from '../../../../../../src/Auth/Passport/AuthStrategy'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = { users: true, userTokens: true }

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

describe('backchannelLogout - POST api/v1/auth/backchannel_logout', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
    await seedAccounts()

    AuthStrategy.verifyLogoutToken = (
      _req: Request,
      _res: Response,
      next: NextFunction
    ) => {
      return next()
    }
  })

  test('should logout successfully if iamSessionID is valid', async () => {
    const response: supertest.Response = await backchannelLogout(
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      { logout_token: validLogoutToken }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should fail if user token not exists', async () => {
    const response: supertest.Response = await backchannelLogout(
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      { logout_token: invalidLogoutToken }
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if user status not exists', async () => {
    const response: supertest.Response = await backchannelLogout(
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      { logout_token: validLogoutToken2 }
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })
})
