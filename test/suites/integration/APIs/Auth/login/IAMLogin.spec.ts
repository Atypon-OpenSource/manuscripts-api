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
import * as _ from 'lodash'

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  drop,
  seed,
  testDatabase,
  dropBucket
} from '../../../../../utilities/db'

import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'

import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { config } from '../../../../../../src/Config/Config'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { iamOAuthStart } from '../../../../../api'
import { URL } from 'url'
import {
  validIAMOAuthStartRequest
} from '../../../../../data/fixtures/requests'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }
const existingConfig: any = _.cloneDeep(config)

beforeAll(async () => {
  db = await testDatabase()
})

async function seedAccounts () {
  await DIContainer.sharedContainer.syncService.getOrCreateUserStatus(
      'User|' + validBody.email
    )
}

afterAll(() => db.bucket.disconnect())
afterEach(() => {
  for (const key in existingConfig) {
    const c: any = config
    c[key] = _.cloneDeep(existingConfig[key])
  }
})

describe('IAM Login - GET api/v1/auth/iam', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await seedAccounts()
  })

  test('should redirect to IAM auth portal when the app ID is included in the headers', async () => {
    const response: supertest.Response = await iamOAuthStart(
      validIAMOAuthStartRequest.headers,
      validIAMOAuthStartRequest.query
    )

    expect(response.header.location).toEqual(
      expect.stringContaining(
        'https://manuscripts-stag.connectscience.io/api/oauth/authorize'
      )
    )
    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
  })

  test('should redirect to frontend when the app ID is included in the query', async () => {
    const response: supertest.Response = await iamOAuthStart(
      {}, { ...validIAMOAuthStartRequest.query, ...validIAMOAuthStartRequest.headers }
    )

    expect(response.header.location).toEqual(
      expect.stringContaining(
        'https://manuscripts-stag.connectscience.io/api/oauth/authorize'
      )
    )
    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
  })

  test('state should contain sent referer header value', async () => {
    const response: supertest.Response = await iamOAuthStart(
        { referer: 'https://lw-manuscripts-frontend.ciplit.com' }, { ...validIAMOAuthStartRequest.query, ...validIAMOAuthStartRequest.headers }
    )
    const urlStr = response.header.location
    expect(urlStr).toEqual(
        expect.stringContaining(
            'https://manuscripts-stag.connectscience.io/api/oauth/authorize'
        )
    )

    const url = new URL(urlStr)
    const searchParams = url.searchParams
    const stateValue = searchParams.get('state') as string
    const state = DIContainer.sharedContainer.authService.decodeIAMState(stateValue)
    expect(state.redirectBaseUri).toEqual('https://lw-manuscripts-frontend.ciplit.com')
    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
  })
})
