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

import { drop, seed, testDatabase, dropBucket } from '../../../../../utilities/db'
import { googleLogin } from '../../../../../api'
import { GOOGLE_AUTH_URI } from '../../../../../data/fixtures/misc'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import {
  validGoogleRequestWithHeader,
  validGoogleRequestNoHeaders
} from '../../../../../data/fixtures/requests'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }

beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

describe('Google Login - GET api/v1/auth/google', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should redirect to google auth portal when the app ID is included in the headers', async () => {
    const response: supertest.Response = await googleLogin(
      validGoogleRequestWithHeader.headers, validGoogleRequestWithHeader.query
    )

    expect(response.header.location).toEqual(
      expect.stringContaining(GOOGLE_AUTH_URI)
    )
    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
  })

  test('should redirect to google auth portal when the app ID is included in the query', async () => {
    const response: supertest.Response = await googleLogin(
      {}, validGoogleRequestNoHeaders.query
    )

    expect(response.header.location).toEqual(
      expect.stringContaining(GOOGLE_AUTH_URI)
    )
    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
  })
})
