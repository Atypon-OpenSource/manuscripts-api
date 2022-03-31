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

import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { drop, dropBucket, seed, testDatabase } from '../../../../../utilities/db'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import * as supertest from 'supertest'
import { basicLogin, importManuscript } from '../../../../../api'
import {
  authorizationHeader,
  ValidContentTypeAcceptJsonHeader,
  ValidHeaderWithApplicationKey,
} from '../../../../../data/fixtures/headers'
import * as HttpStatus from 'http-status-codes'
import { validManuscript } from '../../../../../data/fixtures/manuscripts'

let db: any = null
const seedOptions: SeedOptions = {
  users: true,
  userProfiles: true,
  applications: true,
  projects: true,
  manuscript: true,
  templates: true,
}

beforeAll(async () => {
  db = await testDatabase()
  /*await Promise.all(
    GATEWAY_BUCKETS.map((key) => {
      return DIContainer.sharedContainer.syncService.createGatewayAccount(
        'User|' + validBody.email,
        key
      )
    })
  )*/
})

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('ContainerService - createProject', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })
  test('should import jats into new manuscript', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)

    const sendFileResponse = await importManuscript(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-2',
      },
      'test/data/fixtures/jats-arc.zip'
    )
    expect(sendFileResponse.status).toBe(HttpStatus.OK)
  })

  test('should import jats into an existing manuscript', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)

    const sendFileResponse = await importManuscript(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-2',
      },
      'test/data/fixtures/jats-arc.zip',
      validManuscript._id
    )
    expect(sendFileResponse.status).toBe(HttpStatus.OK)
  })

  test('should import jats and update manuscript with templateId', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)

    const sendFileResponse = await importManuscript(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-2',
      },
      'test/data/fixtures/jats-arc.zip',
      validManuscript._id,
      'MPManuscriptTemplate:valid-template-2'
    )
    expect(sendFileResponse.status).toBe(HttpStatus.OK)
  })

  test('should import jats and update manuscript with templateId 2', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)

    const sendFileResponse = await importManuscript(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-2',
      },
      'test/data/fixtures/jats-arc.zip',
      validManuscript._id,
      'MPManuscriptTemplate:www-zotero-org-styles-nature-genetics-Nature-Genetics-Journal-Publication-Article'
    )
    expect(sendFileResponse.status).toBe(HttpStatus.OK)
  })
})