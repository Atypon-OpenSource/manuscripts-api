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
import { logout, basicLogin } from '../../../../../api'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import { ValidHeaderWithApplicationKey, authorizationHeader } from '../../../../../data/fixtures/headers'
import { invalidUserJWTToken, stringPayloadToken, validJWTToken } from '../../../../../data/fixtures/authServiceUser'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { UserClaim } from '../../../../../../src/Auth/Interfaces/UserClaim'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'


jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }

beforeAll(async () => {
  db = await testDatabase()
})

async function seedAccounts () {
  await DIContainer.sharedContainer.syncService.createGatewayAccount(
      'User|' + validBody.email
    )
}

afterAll(() => db.bucket.disconnect())

describe('Logout - POST api/v1/auth/logout', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
    await seedAccounts()
  })

  test('ensures that a valid logged in user can log out', async () => {
    const loginResponse: supertest.Response = await basicLogin(validBody, ValidHeaderWithApplicationKey)

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const logoutResponse = await logout(header)

    // const cookieHeader = logoutResponse.header['set-cookie'][0]
    // const parsedCookie = cookie.parse(cookieHeader)
    // const dataBucketPath = `/${config.DB.buckets[BucketKey.Data]}`

    // check that the /projects cookie (i.e. config.DB.buckets[BucketKey.Data]]) gets cleared.
    // expect(parsedCookie[dataBucketPath]).toEqual('')
    expect(logoutResponse.status).toBe(HttpStatus.TEMPORARY_REDIRECT)
  })

  test('ensures that a non logged in user can not log out', async () => {
    const loginResponse: supertest.Response = await basicLogin(validBody, ValidHeaderWithApplicationKey)

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)
    let logoutResponse = await logout(header)

    expect(logoutResponse.status).toBe(HttpStatus.TEMPORARY_REDIRECT)
    logoutResponse = await logout(header)

    expect(logoutResponse.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('ensures that a non-JWT token cannot log out', async () => {
    const loginResponse: supertest.Response = await basicLogin(validBody, ValidHeaderWithApplicationKey)

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader('')
    const response: supertest.Response = await logout(header)

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('ensures that a user without authentication header cannot log out', async () => {
    const loginResponse: supertest.Response = await basicLogin(validBody, ValidHeaderWithApplicationKey)

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = {}
    const response: supertest.Response = await logout(header)

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('ensures that a user who does not exist in database cannot log out', async () => {
    const header = authorizationHeader(invalidUserJWTToken)
    const response: supertest.Response = await logout(header)

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should fail if token is sent but not in a valid format', async () => {
    const header = authorizationHeader(stringPayloadToken)

    AuthStrategy.userValidationCallback = (_error: Error | null, _user: UserClaim | null, req: Request, _res: Response, next: NextFunction) => {
      req.user = {
        _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a'
      }
      return next()
    }

    const response: supertest.Response = await logout(header)

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should fail if token is sent but does not has Bearer prefix', async () => {
    const header = {
      authorization: stringPayloadToken
    }

    AuthStrategy.userValidationCallback = (_error: Error | null, _user: UserClaim | null, req: Request, _res: Response, next: NextFunction) => {
      req.user = {
        _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a'
      }
      return next()
    }

    const response: supertest.Response = await logout(header)

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if token does not exist in the DB', async () => {
    const header = authorizationHeader(validJWTToken)

    AuthStrategy.userValidationCallback = (_error: Error | null, _user: UserClaim | null, req: Request, _res: Response, next: NextFunction) => {
      req.user = {
        _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a'
      }
      return next()
    }

    const response: supertest.Response = await logout(header)

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})
