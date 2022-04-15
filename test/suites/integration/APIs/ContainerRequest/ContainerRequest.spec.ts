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
import { validProject } from '../../../../data/fixtures/projects'
import { createContainerReq, purgeContainerReq, createProject } from '../../../../data/fixtures/misc'

let db: any = null

beforeAll(async () => {
  db = await testDatabase()
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
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody.email}`,
        name: 'foobar',
        email: validBody.email
      }
    )
  })

  test('should create container request', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)
    await purgeContainerReq(`MPContainerRequest:${checksum(
      'User_valid-user@manuscriptsapp.com-MPProject:valid-project-id'
    )}`)
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await createContainerRequest(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      { role: ContainerRole.Writer },
      { containerID: validProject._id }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should update container request if another request exists', async () => {
    //await seed({ userProfiles: true })
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    await createContainerReq(`MPContainerRequest:${checksum(
      'User_valid-user@manuscriptsapp.com-MPProject:valid-project-id-request-4'
    )}`)
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

})

describe('ContainerRequestService - accept', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({
      users: true,
      applications: true,
    })
  })

  test('should accept container request', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)
    await createContainerReq(`MPContainerRequest:${checksum(
      'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-request-2'
    )}`)
    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-request-2')
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
    await createContainerReq(`MPContainerRequest:${checksum(
      'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-request'
    )}`)
    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-request')
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

})

describe('ContainerRequestService - reject', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({
      users: true,
      applications: true,
    })
  })

  test('should reject container request', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)
    await createContainerReq(`MPContainerRequest:${checksum(
      'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-request-2'
    )}`)
    await createProject('MPProject:valid-project-id-2')
    await createProject('MPProject:valid-project-id-request-2')
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

})
