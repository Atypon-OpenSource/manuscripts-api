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

import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import {
  ValidContentTypeAcceptJsonHeader,
  authorizationHeader,
  ValidHeaderWithApplicationKey
} from '../../../../data/fixtures/headers'
import { acceptInvitationToken, basicLogin } from '../../../../api'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import {
  validInvitationToken2,
  validInvitationToken3,
  validInvitationToken4,
  validTokenButInvitationExist,
  validTokenButInvitationExistBetterRole,
  validInvitationToken5
} from '../../../../data/fixtures/invitationTokens'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { ContainerType } from '../../../../../src/Models/ContainerModels'
import { createProject } from '../../../../data/fixtures/misc'


let db: any = null
const seedOptions: SeedOptions = {
  users: true,
  applications: true,
  invitationTokens: true,
  projectInvitations: true
}

beforeAll(async () => {
  db = await testDatabase()
})

async function seedAccounts () {
  await DIContainer.sharedContainer.syncService.getOrCreateUserStatus(
      'User|' + validBody.email
    )
}

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('InvitationService - acceptInvitationToken', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await seedAccounts()
  })

  test('should add new user to the project successfully', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-9')
    const response: supertest.Response = await acceptInvitationToken(
      {
        token: validInvitationToken5.token
      },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerType: ContainerType.project
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should update the role of the user from viewer to writer', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-8')
    const response: supertest.Response = await acceptInvitationToken(
      {
        token: validInvitationToken2.token
      },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerType: 'project'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should not fail if the user is already in the project with the same role', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-8')
    const response: supertest.Response = await acceptInvitationToken(
      {
        token: validInvitationToken3.token
      },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerType: 'project'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should not fail if the user is already in the project with a higher role', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-7')
    const response: supertest.Response = await acceptInvitationToken(
      {
        token: validInvitationToken4.token
      },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerType: 'project'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should accept the sent invitation instead of URI if there is invitation exist with a better role', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    const response: supertest.Response = await acceptInvitationToken(
      {
        token: validTokenButInvitationExist.token
      },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerType: 'project'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should accept the URI instead of sent invitation with a worse role', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id')
    const response: supertest.Response = await acceptInvitationToken(
      {
        token: validTokenButInvitationExistBetterRole.token
      },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerType: 'project'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })
})
