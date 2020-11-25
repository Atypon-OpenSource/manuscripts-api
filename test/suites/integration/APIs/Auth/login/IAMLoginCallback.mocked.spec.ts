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
import { Response, Request, NextFunction } from 'express'
import * as jsonwebtoken from 'jsonwebtoken'
import * as supertest from 'supertest'

import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { AuthStrategy } from '../../../../../../src/Auth/Passport/AuthStrategy'
import { testDatabase } from '../../../../../utilities/db'
import { validApplication } from '../../../../../data/fixtures/applications'
import { AuthService } from '../../../../../../src/DomainServices/Auth/AuthService'
import { iamOAuthCallback } from '../../../../../api'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null

beforeAll(async () => (db = await testDatabase()))
afterAll(() => db.bucket.disconnect())

describe('GET api/v1/auth/iam/callback', () => {
  AuthStrategy.verifyIAMToken = (
    _req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    next()
  }

  test('should redirect user to login page with error', async () => {
    const token = jsonwebtoken.sign(
      {
        email: 'valid-user-1@manuscriptsapp.com',
        iss: 'atypon.com',
        sub: 'anything',
        sid: 'anything',
        nonce: 'random-string',
        email_verified: true,
        exp: Date.now(),
        name: 'Foobarovic',
        aud: validApplication._id
      } as any,
      'asd'
    )

    const state = AuthService.encodeIAMState({
      redirectUri: 'redirectUri',
      theme: 'theme'
    } as any)

    const response: supertest.Response = await iamOAuthCallback(
      {
        state,
        id_token: token
      },
      { cookie: 'nonce=another-string' }
    )

    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
  })
})
