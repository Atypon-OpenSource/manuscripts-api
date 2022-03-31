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

import { basicLogin, SGCreate, SGGet, SGUpdate, SGDelete } from '../../../../api'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { validBody } from '../../../../data/fixtures/credentialsRequestPayload'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import {
  ValidContentTypeAcceptJsonHeader,
  authorizationHeader,
  ValidHeaderWithApplicationKey,
} from '../../../../data/fixtures/headers'
import { validProject } from '../../../../data/fixtures/projects'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import _ from 'lodash'

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }

beforeAll(async () => {
  db = await testDatabase()
  await drop()
  await dropBucket(BucketKey.Data)
  await seed(seedOptions)
  await seedAccounts()
})

async function seedAccounts() {
  await DIContainer.sharedContainer.syncService.createGatewayAccount(
    'User|' + validBody.email,
    null
  )
}

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(180000)

describe('SG - CRUD', () => {
  let currentRev: any
  test('should create a project', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await SGCreate(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      validProject,
      {
        db: 'project',
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    const doc = response.body
    currentRev = doc._rev
    expect(doc).toEqual(expect.objectContaining(validProject))
    expect(doc._rev).toEqual(`${doc._depth}-${doc._revisions.ids[0]}`)
    expect(doc._parent_rev).toBeNull()
  })

  test('should patch the project by id', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const body = { viewers: ['random'] }

    const response: supertest.Response = await SGUpdate(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      { rev: currentRev },
      body,
      {
        db: 'project',
        id: validProject._id,
      }
    )

    expect(response.status).toBe(HttpStatus.OK)

    const doc = response.body
    expect(doc.viewers).toEqual(body.viewers)
    expect(doc).toEqual(expect.objectContaining({ ...validProject, ...body }))
    expect(doc._rev).toEqual(`${doc._depth}-${doc._revisions.ids[0]}`)
    expect(doc._parent_rev).toEqual(`${doc._depth - 1}-${doc._revisions.ids[1]}`)
  })

  test('should fail to patch with a bad revision', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const body = { viewers: ['random'] }

    const response: supertest.Response = await SGUpdate(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      { rev: 'whatever' },
      body,
      {
        db: 'project',
        id: validProject._id,
      }
    )

    expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
  })

  test('should get the project by id', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await SGGet(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {},
      {
        db: 'project',
        id: validProject._id,
      }
    )
    expect(response.status).toBe(HttpStatus.OK)

    const doc = response.body
    const body = { viewers: ['random'] }
    expect(doc).toEqual(expect.objectContaining({ ...validProject, ...body }))
  })

  test('should delete the project by id', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await SGDelete(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        rev: 'random',
      },
      {
        db: 'project',
        id: validProject._id,
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should not get the project by id after removal', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await SGGet(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {},
      {
        db: 'project',
        id: validProject._id,
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
    expect(response.body).toEqual({})
  })

  test('should create after patch for non existing project', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const body = validProject

    const response: supertest.Response = await SGUpdate(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      { rev: 'random' },
      body,
      {
        db: 'project',
        id: validProject._id,
      }
    )

    expect(response.status).toBe(HttpStatus.OK)

    const doc = response.body
    expect(doc).toEqual(expect.objectContaining(validProject))
  })
})