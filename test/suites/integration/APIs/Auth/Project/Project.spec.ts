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

import { Model, ObjectTypes } from '@manuscripts/json-schema'
import fs from 'fs'
import { StatusCodes } from 'http-status-codes'
import * as supertest from 'supertest'

import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  basicLogin,
  deleteModel,
  getUserProfiles,
  importManuscript,
  insertProject,
  loadProject,
  saveProject
} from "../../../../../api";
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import {
  authorizationHeader,
  ValidContentTypeAcceptJsonHeader,
  ValidHeaderWithApplicationKey,
} from '../../../../../data/fixtures/headers'
import { validManuscript } from '../../../../../data/fixtures/manuscripts'
import { createManuscript, createProject } from '../../../../../data/fixtures/misc'
import { drop, dropBucket, seed, testDatabase } from '../../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

let db: any = null
const seedOptions: SeedOptions = {
  users: true,
  applications: true,
  templates: true,
}

beforeAll(async () => {
  db = await testDatabase()
})

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT)

describe('ContainerService - createProject', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody.email}`,
      name: 'foobar',
      email: validBody.email,
    })
  })
  test('should import jats into new manuscript', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')

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
    expect(sendFileResponse.status).toBe(StatusCodes.OK)
  })

  test('should import jats into an existing manuscript', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    await createManuscript(
      'MPManuscript:valid-manuscript-id-1',
      'User_valid-user@manuscriptsapp.com'
    )

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
    expect(sendFileResponse.status).toBe(StatusCodes.OK)
  })

  test('should import jats and update manuscript with templateId', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    await createManuscript(
      'MPManuscript:valid-manuscript-id-1',
      'User_valid-user@manuscriptsapp.com'
    )

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
    expect(sendFileResponse.status).toBe(StatusCodes.OK)
  })

  test('should import jats and update manuscript with templateId 2', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    await createManuscript(
      'MPManuscript:valid-manuscript-id-1',
      'User_valid-user@manuscriptsapp.com'
    )

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
    expect(sendFileResponse.status).toBe(StatusCodes.OK)
  })
})

describe('Project - Save Project', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody.email}`,
      name: 'foobar',
      email: validBody.email,
    })
  })

  test('should save project JSON', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)
    await createProject('MPProject:valid-project-id-2')
    await createManuscript('MPManuscript:valid-manuscript-id-1')

    const authHeader = authorizationHeader(loginResponse.body.token)
    const data = await fs.readFileSync('test/data/fixtures/sample/index.manuscript-json')
    const json = JSON.parse(data.toString())
    const sendFileResponse = await saveProject(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-2',
      },
      {
        data: json.data,
      }
    )
    expect(sendFileResponse.status).toBe(StatusCodes.OK)
  })
})

describe('Project - insert Project', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody.email}`,
      name: 'foobar',
      email: validBody.email,
    })
  })
  test('Should insert new JSON to DB', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)
    await createProject('MPProject:valid-project-id-2')
    await createManuscript('MPManuscript:valid-manuscript-id-1')

    const authHeader = authorizationHeader(loginResponse.body.token)
    const data = await fs.readFileSync('test/data/fixtures/sample/index.manuscript-json')
    const json = JSON.parse(data.toString())
    const result = await insertProject(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-2',
        manuscriptID: 'MPManuscript:valid-manuscript-id-1',
      },
      {
        data: json.data,
      }
    )
    expect(result.status).toBe(StatusCodes.OK)
  })

  test('project resources should be removed before inserting new JSON', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)
    await createProject('MPProject:valid-project-id-2')
    await createManuscript('MPManuscript:valid-manuscript-id-1')

    const authHeader = authorizationHeader(loginResponse.body.token)
    const data = await fs.readFileSync('test/data/fixtures/sample/index.manuscript-json')
    const json = JSON.parse(data.toString())
    await insertProject(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-2',
        manuscriptID: 'MPManuscript:valid-manuscript-id-1',
      },
      {
        data: json.data,
      }
    )
    const repo: any = DIContainer.sharedContainer.projectRepository
    repo.bulkInsert = Promise.resolve(async (docs: any) => {
      const oldData = await DIContainer.sharedContainer.projectRepository.getContainerResources(
        'MPProject:valid-project-id-2',
        'MPManuscript:valid-manuscript-id-1',
        true
      )
      // this is to make sure all data were removed
      expect(oldData).toBeNull()
      return docs
    })
  })
})

describe('ContainerService - get collaborators', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody.email}`,
      name: 'foobar',
      email: validBody.email,
    })
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|valid-user-2@manuscriptsapp.com`,
      name: 'foobar2',
      email: 'valid-user-2@manuscriptsapp.com',
    })
  })
  test('should get collaborators', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)
    await createProject('MPProject:valid-project-id-12')

    const authHeader = authorizationHeader(loginResponse.body.token)
    const collaboratorsResponse = await getUserProfiles(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-12',
      }
    )
    expect(collaboratorsResponse.status).toBe(StatusCodes.OK)
    expect(collaboratorsResponse.body.length).toBe(2)
    expect(collaboratorsResponse.body[0].objectType).toBe(ObjectTypes.UserCollaborator)
  })
})

describe('Project - Delete Model', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody.email}`,
      name: 'foobar',
      email: validBody.email,
    })
  })

  test('should delete model in project', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)
    await createProject('MPProject:valid-project-id-2')
    await createManuscript('MPManuscript:valid-manuscript-id-1')

    const authHeader = authorizationHeader(loginResponse.body.token)
    const data = await fs.readFileSync('test/data/fixtures/sample/index.manuscript-json')
    const json = JSON.parse(data.toString())
    const sendFileResponse = await saveProject(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-2',
      },
      {
        data: json.data,
      }
    )
    expect(sendFileResponse.status).toBe(StatusCodes.OK)

    const deleteModelResponse = await deleteModel(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-2',
        manuscriptID: 'MPManuscript:valid-manuscript-id-1',
        modelID: 'MPParagraphElement:2F64B77A-161C-48BB-AC09-C7EF425F752F',
      }
    )

    expect(deleteModelResponse.status).toBe(StatusCodes.OK)

    const response: supertest.Response = await loadProject(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {},
      {
        projectId: 'MPProject:valid-project-id-2',
      }
    )
    expect(response.status).toBe(StatusCodes.OK)

    const models: Model[] = JSON.parse(response.text)
    expect(
      models.some(({ _id }) => _id === 'MPParagraphElement:2F64B77A-161C-48BB-AC09-C7EF425F752F')
    ).toBe(false)
  })
})
