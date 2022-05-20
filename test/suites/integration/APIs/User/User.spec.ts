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

import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import { markUserForDeletion, unmarkUserForDeletion, basicLogin, getProfile, userContainers } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import {
  ValidContentTypeAcceptJsonHeader,
  authorizationHeader,
  ValidHeaderWithApplicationKey
} from '../../../../data/fixtures/headers'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'

let db: any = null
beforeAll(async () => {
  db = await testDatabase()
  await DIContainer.sharedContainer.syncService.getOrCreateUserStatus(
      'User|' + validBody.email,
    )
})

afterAll(async () => db && db.bucket.disconnect())

jest.setTimeout(TEST_TIMEOUT)

describe('UserService - getProfile', () => {
  beforeEach(async () => {
    const seedOptions: SeedOptions = { users: true, applications: true }

    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
  })

  test('getProfile should get users profile', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await getProfile({
      ...ValidContentTypeAcceptJsonHeader,
      ...authHeader
    })
    expect(response.body).toBeTruthy()
    expect(response.status).toBe(HttpStatus.OK)
  })
})

describe('UserService - markUserForDeletion', () => {
  beforeEach(async () => {
    const seedOptions: SeedOptions = {
      users: true,
      applications: true,
      projects: true
    }

    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
  })

  test('should mark user for deletion and send email', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await markUserForDeletion(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        password: '12345'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

})

describe('UserService - unmarkUserForDeletion', () => {
  beforeEach(async () => {
    const seedOptions: SeedOptions = {
      users: true,
      applications: true,
      projects: true
    }

    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
  })

  test('should unmark user for deletion', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await unmarkUserForDeletion(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })
})

describe('ContainerService - userContainers', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ users: true, applications: true, projects: true })
    await DIContainer.sharedContainer.syncService.createUserProfile(
      {
        _id: `User|${validBody.email}`,
        name: 'foobar',
        email: validBody.email
      }
    )
  })

  test('should retrieve all projects', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await userContainers({
      ...ValidContentTypeAcceptJsonHeader,
      ...authHeader
    })

    expect(response.status).toBe(HttpStatus.OK)
  })
})
