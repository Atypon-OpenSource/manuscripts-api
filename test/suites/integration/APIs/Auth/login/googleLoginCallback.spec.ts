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

import { NextFunction, Response, Request } from 'express'
import * as HttpStatus from 'http-status-codes'
import * as supertest from 'supertest'

import { drop, testDatabase } from '../../../../../utilities/db'
import { googleLoginCallback } from '../../../../../api'
import { AuthStrategy } from '../../../../../../src/Auth/Passport/AuthStrategy'
import { UserClaim } from '../../../../../../src/Auth/Interfaces/UserClaim'
import { config } from '../../../../../../src/Config/Config'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null

beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

describe('Google Login - GET api/v1/auth/google/callback', () => {
  beforeEach(async () => {
    await drop()
  })

  test('should log user in and redirect user to login page with token data in the query string', async () => {
    AuthStrategy.googleUserValidationCallback = (
      _error: Error | null,
      _user: UserClaim | null,
      req: Request,
      _res: Response,
      next: NextFunction
    ) => {
      req.user = {
        _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
        syncSessions: ['9f338224b0d545aab02c21c7e0c3c07a']
      }
      return next()
    }

    const response: supertest.Response = await googleLoginCallback({
      code: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
      state: '9f338224b0d545aab02c21c7e0c3c07a',
      scope: AuthStrategy.googleScopesString
    })

    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
    expect(response.header.location).toEqual(
      expect.stringContaining(`${config.email.fromBaseURL}/login#access_token=`)
    )
  })

  test('should redirect user to login page with error flag in the query string if the user doesn\'t exist in the req.user', async () => {
    AuthStrategy.googleUserValidationCallback = (_error: Error | null, _user: UserClaim | null, req: Request, _res: Response, next: NextFunction) => {
      req.user = undefined
      return next()
    }

    const response: supertest.Response = await googleLoginCallback({
      code: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
      state: '9f338224b0d545aab02c21c7e0c3c07a',
      scope: AuthStrategy.googleScopesString
    })

    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
    expect(response.header.location).toEqual(
      expect.stringContaining(`${config.email.fromBaseURL}/login#error`)
    )
  })

  test('should redirect user to login page with error flag in the query string if the \'syncSessions\' doesn\'t exist in the req.user', async () => {
    AuthStrategy.googleUserValidationCallback = (_error: Error | null, _user: UserClaim | null, req: Request, _res: Response, next: NextFunction) => {
      req.user = {
      }
      return next()
    }

    const response: supertest.Response = await googleLoginCallback({
      code: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
      state: '9f338224b0d545aab02c21c7e0c3c07a',
      scope: AuthStrategy.googleScopesString
    })

    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
    expect(response.header.location).toEqual(
      expect.stringContaining(`${config.email.fromBaseURL}/login#error`)
    )
  })
})
