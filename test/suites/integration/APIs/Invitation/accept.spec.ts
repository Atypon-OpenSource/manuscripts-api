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

jest.mock('email-templates', () =>
  jest.fn().mockImplementation(() => {
    return {
      send: jest.fn(() => Promise.resolve({})),
      render: jest.fn(() => Promise.resolve({}))
    }
  })
)

jest.mock('../../../../../src/DomainServices/External/AWS', () => ({
  SES: { sendEmail: jest.fn((_foo, callback) => callback(null, { foo: 1 })) }
}))

import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { ValidContentTypeAcceptJsonHeader, ValidHeaderWithApplicationKey, authorizationHeader } from '../../../../data/fixtures/headers'
import { accept, basicLogin } from '../../../../api'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { validBody2 } from '../../../../../test/data/fixtures/credentialsRequestPayload'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'

let db: any = null
const seedOptions: SeedOptions = {
  users: true,
  invitations: true,
  projects: true,
  projectInvitations: true
}

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

  test('should create collaboration', async () => {
    const response: supertest.Response = await accept(
      {
        invitationId: `MPInvitation:${checksum(
          'valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com',
          { algorithm: 'sha1' }
        )}`
      },
      { ...ValidContentTypeAcceptJsonHeader }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should create new user and create a collaboration ', async () => {
    const response: supertest.Response = await accept(
      {
        invitationId: `MPInvitation:${checksum(
          'valid-user@manuscriptsapp.com-valid-user-4@manuscriptsapp.com',
          { algorithm: 'sha1' }
        )}`,
        name: 'Valid System User',
        password: '12345678'
      },
      { ...ValidContentTypeAcceptJsonHeader }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })
})

describe('InvitationService - acceptProjectInvite', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projects: true, projectInvitations: true, users: true, applications: true })
  })

  test('should accept the invitation and update user role in case the user have a more limiting role', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await accept(
      {
        invitationId: `MPContainerInvitation:${checksum(
          'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-7',
          { algorithm: 'sha1' }
        )}`,
        name: 'Valid System User'
      },
      { ...ValidContentTypeAcceptJsonHeader,
        ...header
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should add the user to the project', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.emailService.sendContainerInvitationAcceptance = jest.fn(() =>
      Promise.resolve({})
    )

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await accept(
      {
        invitationId: `MPContainerInvitation:${checksum(
          'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-6',
          { algorithm: 'sha1' }
        )}`
      },
      { ...ValidContentTypeAcceptJsonHeader,
        ...header
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    expect(containerInvitationService.emailService.sendContainerInvitationAcceptance).toBeCalled()
    containerInvitationService.emailService.sendContainerInvitationAcceptance.mockClear()
  })

  test('should allow opting out of notification email', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.emailService.sendContainerInvitationAcceptance = jest.fn(() =>
      Promise.resolve({})
    )
    containerInvitationService.emailService.sendOwnerNotificationOfCollaborator = jest.fn(() =>
      Promise.resolve({})
    )

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await accept(
      {
        invitationId: `MPContainerInvitation:${checksum(
          'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-6',
          { algorithm: 'sha1' }
        )}`,
        skipEmail: true
      },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    expect(containerInvitationService.emailService.sendContainerInvitationAcceptance).not.toBeCalled()
    expect(containerInvitationService.emailService.sendOwnerNotificationOfCollaborator).not.toBeCalled()
    containerInvitationService.emailService.sendContainerInvitationAcceptance.mockClear()
    containerInvitationService.emailService.sendOwnerNotificationOfCollaborator.mockClear()
  })
})
