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
import { Chance } from 'chance'

import { basicLogin } from '../../../../../api'
import {
  validBody
} from '../../../../../data/fixtures/credentialsRequestPayload'
import {
  ValidHeaderWithApplicationKey
} from '../../../../../data/fixtures/headers'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { AuthStrategy } from '../../../../../../src/Auth/Passport/AuthStrategy'
import { testDatabase } from '../../../../../utilities/db'
import { APP_ID_HEADER_KEY } from '../../../../../../src/Controller/V1/Auth/AuthController'

const chance = new Chance()
jest.setTimeout(TEST_TIMEOUT)

let db: any = null

beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

describe('Basic Login - POST api/v1/auth/login', () => {
  test('should fail if appId is not string', async () => {
    AuthStrategy.applicationValidation = () => async (req: Request, _res: Response, next: NextFunction) => {
      const numericValue: any = chance.integer()
      req.headers[APP_ID_HEADER_KEY] = numericValue
      return next()
    }

    const response = await basicLogin(validBody, ValidHeaderWithApplicationKey)
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})
