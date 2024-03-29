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

import { StatusCodes } from 'http-status-codes'
import * as supertest from 'supertest'

jest.mock('email-templates', () =>
  jest.fn().mockImplementation(() => {
    return {
      send: jest.fn(() => Promise.resolve({})),
      render: jest.fn(() => Promise.resolve({})),
    }
  })
)

import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { SingleUseTokenQueryCriteria } from '../../../../../src/DataAccess/Interfaces/QueryCriteria'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { SingleUseToken, SingleUseTokenType } from '../../../../../src/Models/SingleUseTokenModels'
import { connectSignup, signup } from '../../../../api'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import {
  ValidContentTypeAcceptJsonHeader,
  ValidContentTypeAcceptWithCharsetJsonHeader,
  ValidHeaderWithApplicationKey,
} from '../../../../data/fixtures/headers'
import { validNewUserCredentials } from '../../../../data/fixtures/registrationCredentials'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

let db: any = null
const seedOptions: SeedOptions = { users: true, singleUseTokens: true, applications: true }

beforeAll(async () => (db = await testDatabase()))
afterAll(() => db.bucket.disconnect())

jest.setTimeout(TEST_TIMEOUT)

describe('ConnectSignup - signup', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await DIContainer.sharedContainer.syncService.getOrCreateUserStatus('User|' + validBody.email)
  })
  test('should create new user', async () => {
    const response: supertest.Response = await connectSignup(
      {
        email: 'someEmail@email.com',
        name: 'somename',
        connectUserID: 'someConnectID',
      },
      {
        ...ValidHeaderWithApplicationKey,
      }
    )
    expect(response.status).toBe(StatusCodes.NO_CONTENT)
  })
})
