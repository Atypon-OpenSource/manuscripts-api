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
import checksum from 'checksum'

jest.mock('email-templates', () => jest.fn().mockImplementation(() => {
  return {
    send: jest.fn(() => Promise.resolve({})),
    render: jest.fn(() => Promise.resolve({}))
  }
}))

jest.mock('../../../../../src/DomainServices/External/AWS', () => ({
  SES: { sendEmail: jest.fn((_foo, callback) => callback(null, { foo: 1 })) }
}))

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import {
  ValidContentTypeAcceptJsonHeader
} from '../../../../data/fixtures/headers'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { accept } from '../../../../api'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'

let db: any = null
const seedOptions: SeedOptions = { users: true, invitations: true }

beforeAll(async () => {
  db = await testDatabase()
})

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('InvitationService - accept', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should fail if invited user not found', async () => {
    const repository: any = DIContainer.sharedContainer.userRepository
    repository.getOne = jest.fn(() => null)
    const invitation = {
      invitationId: `MPInvitation:${checksum('valid-user@manuscriptsapp.com-valid-user-4@manuscriptsapp.com', { algorithm: 'sha1' })}`,
      name: 'Valid System User',
      password: '12345678'
    }
    const response: supertest.Response = await accept(invitation,
      { ...ValidContentTypeAcceptJsonHeader })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)

  })

})
