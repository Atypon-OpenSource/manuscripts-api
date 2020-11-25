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
import { NextFunction } from 'express'

jest.setMock('express-joi-middleware', (_val: any, _val2: any) => async (req: Request, _res: Response, next: NextFunction) => {
  (req as any).query.token = 123
  return next()
})

import { verify } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { testDatabase } from '../../../../utilities/db'

let db: any = null

beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

jest.setTimeout(TEST_TIMEOUT)

describe('UserRegistrationService - signup', () => {
  test('should fail if token is not string', async () => {
    const query = {
      token: 123
    }
    const response: supertest.Response = await verify(query)

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })
})
