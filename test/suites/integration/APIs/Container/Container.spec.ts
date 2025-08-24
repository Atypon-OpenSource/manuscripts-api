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
import { Chance } from 'chance'
import checksum from 'checksum'
import { StatusCodes } from 'http-status-codes'
import * as supertest from 'supertest'

import { config } from '../../../../../src/Config/Config'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { ContainerRole, ContainerType } from '../../../../../src/Models/ContainerModels'
import {
  accessToken,
  addProductionNote,
  addUser,
  basicLogin,
  create,
  createManuscript,
  deleteContainer,
  getArchive,
  getProductionNotes,
  loadProject,
  manageUserRole,
  pickerBundle,
} from '../../../../api'
import { validBody, validBody2 } from '../../../../data/fixtures/credentialsRequestPayload'
import {
  authorizationHeader,
  ValidContentTypeAcceptJsonHeader,
  ValidHeaderWithApplicationKey,
} from '../../../../data/fixtures/headers'
import { validNote1 } from '../../../../data/fixtures/ManuscriptNote'
import { validManuscript, validManuscript1 } from '../../../../data/fixtures/manuscripts'
import {
  createManuscriptNote,
  createProject,
  createProjectInvitation,
} from '../../../../data/fixtures/misc'
import { validProject } from '../../../../data/fixtures/projects'
import { validUser1, validUser2 } from '../../../../data/fixtures/UserRepository'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'

jest.mock('email-templates', () =>
  jest.fn().mockImplementation(() => {
    return {
      send: jest.fn(() => Promise.resolve({})),
      render: jest.fn(() => Promise.resolve({})),
    }
  })
)

const chance = new Chance()
let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }

beforeAll(async () => {
  db = await testDatabase()
})

async function seedAccounts() {
  await DIContainer.sharedContainer.syncService.getOrCreateUserStatus('User|' + validBody.email)
  await DIContainer.sharedContainer.syncService.getOrCreateUserStatus('User|' + validBody2.email)
}

afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(180000)

describe('ContainerService - createProject', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await seedAccounts()
  })

  test('should create the project', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await create(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {},
      {
        containerType: 'project',
      }
    )
    expect(response.status).toBe(StatusCodes.OK)
  })

  test('should create the project with a specified _id', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await create(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      { _id: chance.guid() },
      {
        containerType: 'project',
      }
    )
    expect(response.status).toBe(StatusCodes.OK)
  })
})

describe('ContainerService - delete', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ ...seedOptions })
    await seedAccounts()
  })

  test('should delete a project with all its resources', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)

    const validContainerId = `MPProject:valid-project-id-6`
    await createProject('MPProject:valid-project-id-6')
    const validInvitationId =
      'MPContainerInvitation:' +
      checksum('valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-6', {
        algorithm: 'sha1',
      })
    await createProjectInvitation(validInvitationId)

    const projectBefore = await DIContainer.sharedContainer.projectRepository.getById(
      validContainerId
    )
    const invitationBefore =
      await DIContainer.sharedContainer.containerInvitationRepository.getById(validInvitationId)

    expect(projectBefore!._id).toBe(validContainerId)
    expect(invitationBefore).not.toBeNull()

    const response: supertest.Response = await deleteContainer(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      { containerID: validContainerId }
    )

    expect(response.status).toBe(StatusCodes.OK)
    const projectAfter = await DIContainer.sharedContainer.projectRepository.getById(
      validContainerId
    )
    const invitationAfter = await DIContainer.sharedContainer.containerInvitationRepository.getById(
      validInvitationId
    )

    expect(projectAfter).toBeNull()
    expect(invitationAfter).toBeNull()
  })

  test('should fail if user is not an owner', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)
    await createProject('MPProject:valid-project-id-9')
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await deleteContainer(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: 'MPProject:valid-project-id-9',
      }
    )

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
  })
})

describe('containerService - addContainerUser', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ users: true, applications: true })
    await seedAccounts()
  })

  test('should add an owner to a project and return true', async () => {
    const containerService = DIContainer.sharedContainer.containerService

    await createProject('MPProject:valid-project-id')
    const didAdd = await containerService.addContainerUser(
      validProject._id,
      ContainerRole.Owner,
      validUser1._id,
    )

    return expect(didAdd).toBeTruthy()
  })

  test('should add a writer to a project and return true', async () => {
    const containerService = DIContainer.sharedContainer.containerService
    await createProject('MPProject:valid-project-id')
    const didAdd = await containerService.addContainerUser(
      validProject._id,
      ContainerRole.Writer,
      validUser1._id,
    )

    return expect(didAdd).toBeTruthy()
  })

  test('should add a viewer to a project and return true', async () => {
    const containerService = DIContainer.sharedContainer.containerService
    await createProject('MPProject:valid-project-id')
    const didAdd = await containerService.addContainerUser(
      validProject._id,
      ContainerRole.Viewer,
      validUser1._id,
    )

    return expect(didAdd).toBeTruthy()
  })

  test('should add user to a project', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)
    await createProject('MPProject:valid-project-id-4')
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await addUser(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        userId: validUser1._id,
        role: ContainerRole.Viewer,
      },
      {
        containerID: 'MPProject:valid-project-id-4',
      }
    )

    expect(response.status).toBe(StatusCodes.OK)
  })

  test('should send email to the added user', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)
    await createProject('MPProject:valid-project-id-4')
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await addUser(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        userId: 'User|valid-google@manuscriptsapp.com',
        role: ContainerRole.Viewer,
      },
      {
        containerID: 'MPProject:valid-project-id-4',
      }
    )

    expect(response.status).toBe(StatusCodes.OK)
  })

  test('should send email to the added user and other owners', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)
    await createProject('MPProject:valid-project-id-2')
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await addUser(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        userId: 'User|valid-google@manuscriptsapp.com',
        role: ContainerRole.Viewer,
      },
      {
        containerID: 'MPProject:valid-project-id-2',
      }
    )

    expect(response.status).toBe(StatusCodes.OK)
  })
})

describe('containerService - manageUserRole', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ users: true, applications: true })
    await seedAccounts()
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody.email}`,
      name: 'foobar',
      email: validBody.email,
    })
  })

  test('manageUserRole successfully add the managedUser if the secret is provided', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-4')
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        managedUserId: 'User|valid-user-6@manuscriptsapp.com',
        newRole: ContainerRole.Viewer,
        secret: config.auth.serverSecret,
      },
      {
        containerID: 'MPProject:valid-project-id-4',
      }
    )

    expect(response.status).toBe(StatusCodes.OK)
  })

  test('manageUserRole should fail if the managedUser is the only owner', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-5')
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        managedUserId: 'User|valid-user@manuscriptsapp.com',
        newRole: chance.string(),
      },
      {
        containerID: 'MPProject:valid-project-id-5',
      }
    )

    expect(response.status).toBe(StatusCodes.FORBIDDEN)
  })

  test('should successfully update user role from writer to viewer', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-4')
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        managedUserId: 'User|valid-user-3@manuscriptsapp.com',
        newRole: ContainerRole.Viewer,
      },
      {
        containerID: 'MPProject:valid-project-id-4',
      }
    )

    expect(response.status).toBe(StatusCodes.OK)
  })

  test('should successfully update user role from viewer to owner', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-4')
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        managedUserId: 'User|valid-user-2@manuscriptsapp.com',
        newRole: ContainerRole.Owner,
      },
      {
        containerID: 'MPProject:valid-project-id-4',
      }
    )

    expect(response.status).toBe(StatusCodes.OK)
  })

  test('should successfully update user role from viewer to writer', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-4')
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        managedUserId: 'User|valid-user-2@manuscriptsapp.com',
        newRole: ContainerRole.Writer,
      },
      {
        containerID: 'MPProject:valid-project-id-4',
      }
    )

    expect(response.status).toBe(StatusCodes.OK)
  })

  test('should successfully remove user role if new role is null', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-4')
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        managedUserId: 'User|valid-user-2@manuscriptsapp.com',
        newRole: null,
      },
      {
        containerID: 'MPProject:valid-project-id-4',
      }
    )

    expect(response.status).toBe(StatusCodes.OK)
  })
})

describe('ContainerService - getArchive', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ users: true, applications: true })
    await seedAccounts()
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody.email}`,
      name: 'foobar',
      email: validBody.email,
    })
  })

  test('should successfully get archive', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    const response: supertest.Response = await getArchive(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {},
      {
        containerID: 'MPProject:valid-project-id-2',
      }
    )
    expect(response.status).toBe(StatusCodes.OK)
  })

  test('should successfully get archive if manuscript provided', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    const response: supertest.Response = await getArchive(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {},
      {
        containerID: 'MPProject:valid-project-id-2',
        manuscriptID: 'MPManuscript:valid-manuscript-id-1',
      }
    )
    expect(response.status).toBe(StatusCodes.OK)
  })
})

describe('ContainerService - loadProject', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ users: true, applications: true })
    await seedAccounts()
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody.email}`,
      name: 'foobar',
      email: validBody.email,
    })
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody2.email}`,
      name: 'foobar2',
      email: validBody2.email,
    })
  })

  test('should successfully loadProject', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
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
  })

  test('should return NOT_MODIFIED', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    const date = new Date()
    date.setTime(date.getTime() + 100000)
    const response: supertest.Response = await loadProject(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
        'if-modified-since': date.toUTCString(),
      },
      {},
      {
        projectId: 'MPProject:valid-project-id-2',
      }
    )
    expect(response.status).toBe(StatusCodes.NOT_MODIFIED)
  })

  test('should successfully loadProject if manuscript provided', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    const response: supertest.Response = await loadProject(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {},
      {
        projectId: 'MPProject:valid-project-id-2',
        manuscriptId: 'MPManuscript:valid-manuscript-id-1',
      }
    )
    expect(response.status).toBe(StatusCodes.OK)
  })
  test('should successfully loadProject if types are provided', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    await createManuscriptNote('MPManuscriptNote:valid-note-id-2')
    const response: supertest.Response = await loadProject(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      { types: [ObjectTypes.ManuscriptNote] },
      {
        projectId: 'MPProject:valid-project-id-2',
      }
    )
    expect(response.status).toBe(StatusCodes.OK)
    expect(response.body.length).toBe(1)
    expect(response.body[0].objectType).toBe(ObjectTypes.ManuscriptNote)
  })

  test('should successfully load notes even if types are not provided', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    await createManuscriptNote('MPManuscriptNote:valid-note-id-2')
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
    const manuscriptsNotes = response.body.filter(
      (model: Model) => model.objectType === ObjectTypes.ManuscriptNote
    )
    expect(manuscriptsNotes.length).toBeGreaterThan(0)
  })
})

describe('ContainerService - pickerBundle', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ users: true, applications: true, manuscript: true })
    await seedAccounts()
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody.email}`,
      name: 'foobar',
      email: validBody.email,
    })
  })

  test('should return html bundle', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-2')
    const accessTokenResponse: supertest.Response = await accessToken(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: `MPProject:valid-project-id-2`,
        scope: 'file-picker',
      }
    )
    expect(accessTokenResponse.status).toBe(StatusCodes.OK)

    const accessTokenHeader = authorizationHeader(accessTokenResponse.text)
    const pickerBundleResponse: supertest.Response = await pickerBundle(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...accessTokenHeader,
      },
      {
        containerType: 'project',
        containerID: `MPProject:valid-project-id-2`,
        manuscriptID: validManuscript._id,
      }
    )
    expect(pickerBundleResponse.status).toBe(StatusCodes.OK)
    expect(pickerBundleResponse.get('Content-Type')).toBe('application/zip')
  })
})

describe('ContainerService - addProductionNote', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ users: true, applications: true, manuscript: true, manuscriptNotes: true })
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody2.email}`,
      name: 'foobar',
      email: validBody2.email,
    })
  })

  test('addProductionNote', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-11')
    const addProductionNoteResponse: supertest.Response = await addProductionNote(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: `MPProject:valid-project-id-11`,
        manuscriptID: validManuscript1._id,
      },
      {
        content: 'Test content',
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD',
      }
    )
    expect(addProductionNoteResponse.status).toBe(StatusCodes.OK)
    expect(addProductionNoteResponse.body.ok).toBe(true)
    expect(addProductionNoteResponse.body.id).toBeTruthy()
  })

  test('addProductionNote with target', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-11')
    const addProductionNoteResponse: supertest.Response = await addProductionNote(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: `MPProject:valid-project-id-11`,
        manuscriptID: validManuscript1._id,
      },
      {
        content: 'Test content (reply)',
        target: validNote1._id,
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD',
      }
    )

    expect(addProductionNoteResponse.status).toBe(StatusCodes.OK)
    expect(addProductionNoteResponse.body.ok).toBe(true)
    expect(addProductionNoteResponse.body.id).toBeTruthy()
  })
})

describe('ContainerService - createManuscript', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({
      users: true,
      applications: true,
      manuscript: true,
      manuscriptNotes: true,
      templates: true,
    })
    await seedAccounts()
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody2.email}`,
      name: 'foobar',
      email: validBody2.email,
    })
  })

  test('should create a manuscript', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-11')
    const response: supertest.Response = await createManuscript(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: `MPProject:valid-project-id-11`,
      }
    )
    expect(response.status).toBe(StatusCodes.OK)
    expect(JSON.parse(response.text).id.startsWith('MPManuscript')).toBeTruthy()
  })

  test('should create a manuscript 1', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-11')
    const response: supertest.Response = await createManuscript(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: `MPProject:valid-project-id-11`,
      },
      {
        templateId: 'MPManuscriptTemplate:valid-template-1',
      }
    )
    expect(response.status).toBe(StatusCodes.OK)
    expect(JSON.parse(response.text).id.startsWith('MPManuscript')).toBeTruthy()
  })

  test('should create a manuscript 2', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    await createProject('MPProject:valid-project-id-11')
    const response: supertest.Response = await createManuscript(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: `MPProject:valid-project-id-11`,
      },
      {
        templateId:
          'MPManuscriptTemplate:www-zotero-org-styles-nature-genetics-Nature-Genetics-Journal-Publication-Article',
      }
    )
    expect(response.status).toBe(StatusCodes.OK)
    expect(JSON.parse(response.text).id.startsWith('MPManuscript')).toBeTruthy()
  })
})

describe('ContainerService - getProductionNotes', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({
      users: true,
      applications: true,
      projects: true,
      manuscript: true,
      manuscriptNotes: true,
    })
    await DIContainer.sharedContainer.syncService.createUserProfile({
      _id: `User|${validBody2.email}`,
      name: 'foobar',
      email: validBody2.email,
    })
  })

  test('should get a list of notes', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(StatusCodes.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const getProductionNoteResponse: supertest.Response = await getProductionNotes(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader,
      },
      {
        containerID: `MPProject:valid-project-id-11`,
        manuscriptID: validManuscript._id,
      }
    )
    expect(getProductionNoteResponse.status).toBe(StatusCodes.OK)
    expect(JSON.parse(getProductionNoteResponse.text).length).toBeGreaterThan(0)
  })
})
