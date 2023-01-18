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

import * as StatusCodes from 'http-status-codes'

import { notFound } from '../../../../../api'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import { ValidHeaderWithApplicationKey } from '../../../../../data/fixtures/headers'
import { testDatabase } from '../../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null

beforeAll(async () => (db = await testDatabase()))
afterAll(() => db.bucket.disconnect())

describe('Not Found - POST api/v1/not/found', () => {
  test('should return 404', async () => {
    const response = await notFound(validBody, ValidHeaderWithApplicationKey)
    return expect(response.status).toEqual(StatusCodes.NOT_FOUND)
  })
})
