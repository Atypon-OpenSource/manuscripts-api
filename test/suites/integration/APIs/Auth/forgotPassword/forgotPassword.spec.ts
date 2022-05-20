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

jest.mock('email-templates', () => jest.fn().mockImplementation(() => {
  return {
    send: jest.fn(() => Promise.resolve({})),
    render: jest.fn(() => Promise.resolve({}))
  }
}))


import * as HttpStatus from 'http-status-codes'
import * as supertest from 'supertest'

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'

import { drop, seed, testDatabase, dropBucket } from '../../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { forgotPassword } from '../../../../../api'

import {
    invalidBody,
    validEmailBody
  } from '../../../../../data/fixtures/credentialsRequestPayload'
import {
  ValidContentTypeAcceptJsonHeader,
  ValidContentTypeAcceptWithCharsetJsonHeader
  } from '../../../../../data/fixtures/headers'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null

const seedOptions: SeedOptions = { users: true }

beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

describe('Forgot Password - POST api/v1/auth/sendForgottenPassword', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
  })

  test('should fail if email does not exist', async () => {
    const response: supertest.Response = await forgotPassword(
        { email : invalidBody.email },
        ValidContentTypeAcceptJsonHeader
      )

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should fail if user status does not exist', async () => {
    await DIContainer.sharedContainer.userStatusRepository.remove(null)

    const response: supertest.Response = await forgotPassword(
        { email : validEmailBody.email },
        ValidContentTypeAcceptJsonHeader
      )

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should send reset password if the email is valid.', async () => {
    const response: supertest.Response = await forgotPassword(
        { email : 'valid-user-3@manuscriptsapp.com' },
        ValidContentTypeAcceptJsonHeader
      )

    expect(response.status).toBe(HttpStatus.NO_CONTENT)
  })

  test('should send Google reset password if the email is valid', async () => {
    const response: supertest.Response = await forgotPassword(
      { email : 'valid-google@manuscriptsapp.com' },
      ValidContentTypeAcceptJsonHeader
    )

    expect(response.status).toBe(HttpStatus.NO_CONTENT)
  })

  test('ensures forgotPassword API does work if Accept and Content-Type headers has charset=UTF-8', async () => {
    const response: supertest.Response = await forgotPassword(
        { email : 'valid-user-3@manuscriptsapp.com' },
        ValidContentTypeAcceptWithCharsetJsonHeader
      )

    expect(response.status).toBe(HttpStatus.NO_CONTENT)
  })
})
