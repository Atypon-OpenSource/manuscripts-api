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

jest.mock('email-templates', () => jest.fn().mockImplementation(() => {
  return {
    send: jest.fn(() => Promise.resolve({})),
    render: jest.fn(() => Promise.resolve({}))
  }
}))

jest.mock('../../../../../src/DomainServices/External/AWS', () => ({
  SES: { sendEmail: jest.fn((_foo, callback) => callback(null, { foo: 1 })) }
}))

import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import {
  ValidContentTypeAcceptJsonHeader
} from '../../../../data/fixtures/headers'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { defaultSystemUser } from '../../../../data/fixtures/user'
import { requestVerificationEmail } from '../../../../api'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'

let db: any = null
const seedOptions: SeedOptions = { users: true, singleUseTokens: true }

beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

jest.setTimeout(TEST_TIMEOUT)

describe('UserRegistrationService - requestVerificationEmail', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should send verification email', async () => {
    const userStatusId = DIContainer.sharedContainer.userStatusRepository.fullyQualifiedId(`User|${defaultSystemUser.email}`)
    await DIContainer.sharedContainer.userStatusRepository.patch(userStatusId, { isVerified: false }, {})

    const response: supertest.Response = await requestVerificationEmail({ email: defaultSystemUser.email }, ValidContentTypeAcceptJsonHeader)

    expect(response.status).toBe(HttpStatus.NO_CONTENT)
  })

  test('should fail if email not in the correct format', async () => {

    const response: supertest.Response = await requestVerificationEmail({ email: 'foo' }, ValidContentTypeAcceptJsonHeader)

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if user\'s email does not exist in the db', async () => {
    const response: supertest.Response = await requestVerificationEmail({ email: 'foo@bar.com' }, ValidContentTypeAcceptJsonHeader)

    expect(response.status).toBe(HttpStatus.NOT_FOUND)
  })

  test('should fail if user\'s status does not exist in the db', async () => {
    await DIContainer.sharedContainer.userStatusRepository.remove(null)
    const response: supertest.Response = await requestVerificationEmail({ email: defaultSystemUser.email },ValidContentTypeAcceptJsonHeader)

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should fail if user already exist and verified', async () => {
    const response: supertest.Response = await requestVerificationEmail({ email: defaultSystemUser.email }, ValidContentTypeAcceptJsonHeader)

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })
})
