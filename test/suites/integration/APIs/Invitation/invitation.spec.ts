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

const emailTemplates = require('email-templates')

import { invite, basicLogin, inviteToContainer } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import {
  ValidContentTypeAcceptJsonHeader,
  ValidHeaderWithApplicationKey,
  authorizationHeader
} from '../../../../data/fixtures/headers'
import {
  validInvitation,
  validInvitation2,
  validProjectInvitation,
  validProjectInvitation2,
  validProjectInvitationWithoutEmail
} from '../../../../data/fixtures/invitation'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { createProjectInvitation, purgeContainerInvitation, createProject } from '../../../../data/fixtures/misc'
import checksum from 'checksum'

let db: any = null
const seedOptions: SeedOptions = {
  users: true,
  invitations: true,
  applications: true
}

beforeAll(async () => {
  db = await testDatabase()
})

afterEach(() => {
  emailTemplates.mockClear()
})

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('InvitationService - invite', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await DIContainer.sharedContainer.syncService.createUserProfile(
      {
        _id: `User|${validBody.email}`,
        name: 'foobar',
        email: validBody.email
      }
    )
  })

  test('should send invitation email', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const invitationService: any =
      DIContainer.sharedContainer.invitationService

    invitationService.emailService.sendInvitation = jest.fn(() =>
      Promise.resolve({})
    )

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await invite(validInvitation2, {
      ...ValidContentTypeAcceptJsonHeader,
      ...header
    })

    expect(response.status).toBe(HttpStatus.OK)
    expect(invitationService.emailService.sendInvitation).toBeCalled()
    invitationService.emailService.sendInvitation.mockClear()
  })

  test('should extend invitation expiry if it already exists', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const invitationService: any =
      DIContainer.sharedContainer.invitationService

    invitationService.emailService.sendInvitation = jest.fn(() =>
      Promise.resolve({})
    )

    const header = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await invite(validInvitation, {
      ...ValidContentTypeAcceptJsonHeader,
      ...header
    })

    expect(response.status).toBe(HttpStatus.OK)
    expect(invitationService.emailService.sendInvitation).toBeCalled()
    invitationService.emailService.sendInvitation.mockClear()
  })
})

describe('InvitationService - inviteToContainer', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await purgeContainerInvitation(checksum(
      'valid-user@manuscriptsapp.com-valid-google2@manuscriptsapp.com-MPProject:valid-project-id-2',
      { algorithm: 'sha1' }
    ))
    await seed({
      users: true,
      applications: true
    })
    await DIContainer.sharedContainer.syncService.createUserProfile(
      {
        _id: `User|${validBody.email}`,
        name: 'foobar',
        email: validBody.email
      }
    )
  })

  test('should send invitation email', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.emailService.sendContainerInvitation = jest.fn(() =>
      Promise.resolve({})
    )

    const header = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    const response: supertest.Response = await inviteToContainer(
      validProjectInvitation2,
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      },
      {
        containerID: 'MPProject:valid-project-id-2'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    expect(response.body).toBeInstanceOf(Array)
    validProjectInvitation2.invitedUsers.forEach((invitedUser, i) => {
      expect(response.body[i][0]).toEqual(invitedUser.email)
      expect(response.body[i][1]).toMatch(/MPContainerInvitation\:(.)+/)
    })
    expect(containerInvitationService.emailService.sendContainerInvitation).toBeCalled()
    containerInvitationService.emailService.sendContainerInvitation.mockClear()
  })

  test('should allow opting out of invitation email', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)
    await createProjectInvitation('MPContainerInvitation:' + checksum(
      'valid-user@manuscriptsapp.com-valid-google2@manuscriptsapp.com-valid-project-id-2',
      { algorithm: 'sha1' }
    ))
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.emailService.sendContainerInvitation = jest.fn(() =>
      Promise.resolve({})
    )

    const header = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    const response: supertest.Response = await inviteToContainer(
      validProjectInvitationWithoutEmail,
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      },
      {
        containerID: 'MPProject:valid-project-id-2'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    expect(response.body).toBeInstanceOf(Array)
    validProjectInvitationWithoutEmail.invitedUsers.forEach((invitedUser, i) => {
      expect(response.body[i][0]).toEqual(invitedUser.email)
      expect(response.body[i][1]).toMatch(/MPContainerInvitation\:(.)+/)
    })
    expect(containerInvitationService.emailService.sendContainerInvitation).not.toBeCalled()
    containerInvitationService.emailService.sendContainerInvitation.mockClear()
  })

  test('should update invitation if it already exists', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    await createProjectInvitation('MPContainerInvitation:' + checksum(
      'valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-valid-project-id-2',
      { algorithm: 'sha1' }
    ))
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.emailService.sendContainerInvitation = jest.fn(() =>
      Promise.resolve({})
    )

    const header = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    const response: supertest.Response = await inviteToContainer(
      validProjectInvitation,
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      },
      {
        containerID: 'MPProject:valid-project-id-2'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    expect(containerInvitationService.emailService.sendContainerInvitation).toBeCalled()
    containerInvitationService.emailService.sendContainerInvitation.mockClear()
  })
})
