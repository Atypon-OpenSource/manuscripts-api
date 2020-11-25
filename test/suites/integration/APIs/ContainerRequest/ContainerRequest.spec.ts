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

import {
  basicLogin,
  createContainerRequest,
  acceptContainerRequest,
  rejectContainerRequest
} from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import {
  ValidContentTypeAcceptJsonHeader,
  authorizationHeader,
  ValidHeaderWithApplicationKey
} from '../../../../data/fixtures/headers'
import { ContainerRole } from '../../../../../src/Models/ContainerModels'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { GATEWAY_BUCKETS } from '../../../../../src/DomainServices/Sync/SyncService'
import { validProject, validProjectRequest } from '../../../../data/fixtures/projects'

let db: any = null

beforeAll(async () => {
  db = await testDatabase()
  await Promise.all(
    GATEWAY_BUCKETS.map(key => {
      return DIContainer.sharedContainer.syncService.createGatewayAccount(
        'User|' + validBody.email,
        key
      )
    })
  )
})

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('ContainerRequestService - create', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({
      users: true,
      applications: true,
      projects: true
    })
  })

  test('should create container request', async () => {
    await seed({ userProfiles: true })
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await createContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      { role: ContainerRole.Writer },
      { containerID: `MPProject:${validProject._id}` }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should update container request if anotehr request exists', async () => {
    await seed({ userProfiles: true, containerRequest: true })
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await createContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      { role: ContainerRole.Owner },
      { containerID: `MPProject:valid-project-id-request-4` }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should fail if user profile does not exist', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await createContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      { role: ContainerRole.Writer },
      { containerID: `MPProject:${validProject._id}` }
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if user has a less limiting role in the project', async () => {
    await seed({ userProfiles: true })
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await createContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      { role: ContainerRole.Writer },
      { containerID: `MPProject:${validProjectRequest._id}` }
    )

    expect(response.status).toBe(HttpStatus.FORBIDDEN)
  })
})

describe('ContainerRequestService - accept', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({
      users: true,
      applications: true,
      projects: true,
      containerRequest: true
    })
  })

  test('should accept container request', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await acceptContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        requestID: `MPContainerRequest:${checksum(
          'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-request-2'
        )}`
      },
      { containerID: `MPProject:valid-project-id-request-2` }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should accept container request and update user\'s role', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await acceptContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        requestID: `MPContainerRequest:${checksum(
          'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-request'
        )}`
      },
      { containerID: `MPProject:valid-project-id-request` }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should fail if user\'s current role is less limiting', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await acceptContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        requestID: `MPContainerRequest:${checksum(
          'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-request-3'
        )}`
      },
      { containerID: `MPProject:valid-project-id-request-3` }
    )

    expect(response.status).toBe(HttpStatus.FORBIDDEN)
  })

  test('should fail if the container request does not exist', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await acceptContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        requestID: `MPContainerRequest:invalid`
      },
      { containerID: `MPProject:valid-project-id-2` }
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if the requesting user does not exist', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await acceptContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        requestID: `MPContainerRequest:${checksum(
          'User_valid-user-MPProject:valid-project-id-2'
        )}`
      },
      { containerID: `MPProject:valid-project-id-2` }
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if the user is not an owner', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await acceptContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        requestID: `MPContainerRequest:${checksum(
          'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-8'
        )}`
      },
      { containerID: `MPProject:valid-project-id-8` }
    )

    expect(response.status).toBe(HttpStatus.FORBIDDEN)
  })
})

describe('ContainerRequestService - reject', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({
      users: true,
      applications: true,
      projects: true,
      containerRequest: true
    })
  })

  test('should reject container request', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await rejectContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        requestID: `MPContainerRequest:${checksum(
          'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-request-2'
        )}`
      },
      { containerID: `MPProject:valid-project-id-2` }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should fail if the container request does not exist', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await rejectContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        requestID: `MPContainerRequest:invalid`
      },
      { containerID: `MPProject:valid-project-id-2` }
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if the requesting user does not exist', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await rejectContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        requestID: `MPContainerRequest:${checksum(
          'User_valid-user-MPProject:valid-project-id-2'
        )}`
      },
      { containerID: `MPProject:valid-project-id-2` }
    )

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if the user is not an owner', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await rejectContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        requestID: `MPContainerRequest:${checksum(
          'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-8'
        )}`
      },
      { containerID: `MPProject:valid-project-id-8` }
    )

    expect(response.status).toBe(HttpStatus.FORBIDDEN)
  })
})
