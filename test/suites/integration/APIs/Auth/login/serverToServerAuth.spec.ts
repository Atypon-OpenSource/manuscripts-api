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

import { Chance } from 'chance'
import { StatusCodes } from 'http-status-codes'
import * as jsonwebtoken from 'jsonwebtoken'
import * as _ from 'lodash'
import * as supertest from 'supertest'

import { config } from '../../../../../../src/Config/Config'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { serverToServerTokenAuth } from '../../../../../api'
import { validBody, validEmailBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import { ValidHeaderWithApplicationKey } from '../../../../../data/fixtures/headers'
import { drop, dropBucket, seed, testDatabase } from '../../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

const chance = new Chance()
let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }
const existingConfig: any = _.cloneDeep(config)

beforeAll(async () => {
  db = await testDatabase()
})

async function seedAccounts() {
  await DIContainer.sharedContainer.syncService.getOrCreateUserStatus('User|' + validBody.email)
}

afterAll(() => db.bucket.disconnect())
afterEach(() => {
  for (const key in existingConfig) {
    const c: any = config
    c[key] = _.cloneDeep(existingConfig[key])
  }
})

describe('Server to Server token Auth - POST api/v1/auth/token', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await seedAccounts()
  })
  test('should return token', async () => {
    const getOrCreateUserStatus = jest.spyOn(
      DIContainer.sharedContainer.userStatusRepository,
      'create'
    )
    const response: supertest.Response = await serverToServerTokenAuth(
      {
        deviceId: chance.guid(),
      },
      {
        ...ValidHeaderWithApplicationKey,
        authorization: `Bearer ${jsonwebtoken.sign(
          { email: validEmailBody.email },
          config.auth.serverSecret
        )}`,
      },
      {
        connectUserID: 'valid-connect-user-7-id',
      }
    )
    // userStatus will be created if not found
    expect(getOrCreateUserStatus).toHaveBeenCalled()
    return expect(response.status).toBe(StatusCodes.OK)
  })
})
