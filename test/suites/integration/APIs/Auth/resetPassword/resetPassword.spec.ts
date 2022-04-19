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

import { drop, seed, testDatabase, dropBucket } from '../../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { resetPassword } from '../../../../../api'
import {
  EmptyAcceptJsonHeader,
  EmptyContentTypeAcceptJsonHeader,
  ValidContentTypeAcceptJsonHeader,
  InValidAcceptJsonHeader,
  ValidHeaderWithApplicationKey,
  ValidHeaderWithCharsetAndApplicationKey
} from '../../../../../data/fixtures/headers'
import {
  validOptions,
  invalidNotStringToken,
  emptyNewPassword,
  emptyTokenAndPassword,
  missingTokenOptions,
  emptyDeviceId,
  validOptionsNotInDB,
  validTokenInvalidUser,
  emptyOptions
} from '../../../../../data/fixtures/resetPasswordOptions'
import { config } from '../../../../../../src/Config/Config'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { InvalidCredentialsError } from '../../../../../../src/Errors'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true, singleUseTokens: true }
const existingConfig: any = _.cloneDeep(config)

beforeAll(async () => {
  db = await testDatabase()
})

async function seedAccounts () {
  await DIContainer.sharedContainer.syncService.getOrCreateUserStatus(
      'User|valid-user@manuscriptsapp.com'
    )
}

afterAll(() => db.bucket.disconnect())
afterEach(() => {
  for (const key in existingConfig) {
    const c: any = config
    c[key] = _.cloneDeep(existingConfig[key])
  }
})

describe('reset Password - POST api/v1/auth/resetPassword', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
    await seedAccounts()
  })

  test('should fail if Options is empty', async () => {
    const response: supertest.Response = await resetPassword(
      emptyOptions,
      ValidHeaderWithApplicationKey
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if Token is not string', async () => {
    const response: supertest.Response = await resetPassword(
      invalidNotStringToken,
      ValidHeaderWithApplicationKey
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if Token is missing', async () => {
    const response: supertest.Response = await resetPassword(
      missingTokenOptions,
      ValidHeaderWithApplicationKey
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if Token & Password are empty', async () => {
    const response: supertest.Response = await resetPassword(
      emptyTokenAndPassword,
      ValidHeaderWithApplicationKey
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if Password is empty', async () => {
    const response: supertest.Response = await resetPassword(
      emptyNewPassword,
      ValidHeaderWithApplicationKey
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if token is not in db', async () => {
    const response: supertest.Response = await resetPassword(
      validOptionsNotInDB,
      ValidHeaderWithApplicationKey
    )

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should fail if an invalid user has a valid token', async () => {
    const response: supertest.Response = await resetPassword(
      validTokenInvalidUser,
      ValidHeaderWithApplicationKey
    )

    expect(response.status).toBe(HttpStatus.NOT_FOUND)
  })

  test('should fail if deviceId is missing', async () => {
    const response: supertest.Response = await resetPassword(
      emptyDeviceId,
      ValidHeaderWithApplicationKey
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should reset if token & password are valid', async () => {
    const response: supertest.Response = await resetPassword(
      validOptions,
      ValidHeaderWithApplicationKey
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('ensures API does not work if app-id & app-secret headers not sent', async () => {
    const response: supertest.Response = await resetPassword(
      validOptions,
      ValidContentTypeAcceptJsonHeader
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures API does not work if Content-Type & Accept headers not sent', async () => {
    const response: supertest.Response = await resetPassword(
      validOptions,
      EmptyContentTypeAcceptJsonHeader
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures API does not work if Accept header not sent', async () => {
    const response: supertest.Response = await resetPassword(
      validOptions,
      EmptyAcceptJsonHeader
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures API does not work if Accept header is invalid', async () => {
    const response: supertest.Response = await resetPassword(
      validOptions,
      InValidAcceptJsonHeader
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures resetPassword API does work if Accept and Content-Type headers has charset=UTF-8', async () => {
    const response: supertest.Response = await resetPassword(
      validOptions,
      ValidHeaderWithCharsetAndApplicationKey
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should fail if password credentials are null', async () => {
    const { authService } = DIContainer.sharedContainer

    return expect(authService.resetPassword(null as any)).rejects.toThrowError(InvalidCredentialsError)
  })
})
