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
import { Chance } from 'chance'
import checksum from 'checksum'

import {
  basicLogin,
  create,
  deleteContainer,
  manageUserRole,
  addUser,
  getArchive,
  accessToken,
  pickerBundle,
  addProductionNote,
  getProductionNotes,
  submitExternalFiles,
  createManuscript,
  getCorrectionStatus,
  createSnapshot
} from '../../../../api'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { validBody, validBody2 } from '../../../../data/fixtures/credentialsRequestPayload'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import {
  ValidContentTypeAcceptJsonHeader,
  authorizationHeader,
  ValidHeaderWithApplicationKey
} from '../../../../data/fixtures/headers'
import { validProject } from '../../../../data/fixtures/projects'
import {
  validLibrary
} from '../../../../data/fixtures/libraries'
import {
  ContainerRole,
  ContainerType
} from '../../../../../src/Models/ContainerModels'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import {
  validUser1,
  validUser2
} from '../../../../data/fixtures/UserRepository'
import { GATEWAY_BUCKETS } from '../../../../../src/DomainServices/Sync/SyncService'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { validManuscript, validManuscript1 } from '../../../../data/fixtures/manuscripts'
import { validNote1 } from '../../../../data/fixtures/ManuscriptNote'
import { config } from '../../../../../src/Config/Config'
import { externalFile } from '../../../../data/fixtures/ExternalFiles'
import _ from 'lodash'
import { createProject, createLibraryCollection, createProjectInvitation, createLibrary } from '../../../../data/fixtures/misc'

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

const chance = new Chance()
let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }

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

jest.setTimeout(180000)

describe('ContainerService - createProject', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should create the project', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await create(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {},
      {
        containerType: 'project'
      }
    )
    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should create the project with a specified _id', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await create(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      { _id: chance.guid() },
      {
        containerType: 'project'
      }
    )
    expect(response.status).toBe(HttpStatus.OK)
  })
})

describe('ContainerService - delete', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ ...seedOptions })
  })

  test('should delete a project with all its resources', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)

    const validContainerId = `MPProject:valid-project-id-6`
    await createProject('valid-project-id-6')
    const validInvitationId = checksum(
      'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-6',
      { algorithm: 'sha1' }
    )
    await createProjectInvitation(validInvitationId)

    const projectBefore = await DIContainer.sharedContainer.projectRepository.getById(
      validContainerId
    )
    const invitationBefore = await DIContainer.sharedContainer.containerInvitationRepository.getById(
      validInvitationId
    )

    expect(projectBefore!._id).toBe(validContainerId)
    expect(invitationBefore).not.toBeNull()

    const response: supertest.Response = await deleteContainer(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      { containerID: validContainerId }
    )

    expect(response.status).toBe(HttpStatus.OK)
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

    expect(loginResponse.status).toBe(HttpStatus.OK)
    await createProject('valid-project-id-9')
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await deleteContainer(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: 'MPProject:valid-project-id-9'
      }
    )

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})

describe('containerService - addContainerUser', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true })
  })

  test('should add an owner to a project and return true', async () => {
    const containerService =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    await createProject('valid-project-id')
    const didAdd = await containerService.addContainerUser(
      validProject._id,
      ContainerRole.Owner,
      validUser1._id,
      validUser2
    )

    return expect(didAdd).toBeTruthy()
  })

  test('should add a writer to a project and return true', async () => {
    const containerService =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    await createProject('valid-project-id')
    const didAdd = await containerService.addContainerUser(
      validProject._id,
      ContainerRole.Writer,
      validUser1._id,
      validUser2
    )

    return expect(didAdd).toBeTruthy()
  })

  test('should add a viewer to a project and return true', async () => {
    const containerService =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    await createProject('valid-project-id')
    const didAdd = await containerService.addContainerUser(
      validProject._id,
      ContainerRole.Viewer,
      validUser1._id,
      validUser2
    )

    return expect(didAdd).toBeTruthy()
  })

  test('should add user to a project', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)
    await createProject('valid-project-id-4')
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await addUser(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        userId: validUser1._id,
        role: ContainerRole.Viewer
      },
      {
        containerID: 'MPProject:valid-project-id-4'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should send email to the added user', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)
    await createProject('valid-project-id-4')
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await addUser(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        userId: 'User|valid-google@manuscriptsapp.com',
        role: ContainerRole.Viewer
      },
      {
        containerID: 'MPProject:valid-project-id-4'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should send email to the added user and other owners', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)
    await createProject('valid-project-id-2')
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await addUser(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        userId: 'User|valid-google@manuscriptsapp.com',
        role: ContainerRole.Viewer
      },
      {
        containerID: 'MPProject:valid-project-id-2'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })
})

describe('containerService - addContainerUser (for libraries)', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true })
  })

  test('should add an owner to a library and cascade the role to library collections', async () => {
    const containerService =
      DIContainer.sharedContainer.containerService[ContainerType.library]

    await createLibraryCollection()
    await createLibrary('valid-library-id')
    const didAdd = await containerService.addContainerUser(
      validLibrary._id,
      ContainerRole.Owner,
      validUser1._id,
      validUser2
    )

    const collections = await DIContainer.sharedContainer.libraryRepository.getContainedLibraryCollections(
      validLibrary._id
    )

    expect(didAdd).toBeTruthy()
    expect(collections[0].owners.includes(validUser1._id.replace('|', '_'))).toBeTruthy()
    expect(collections[0].inherited!.includes(validUser1._id.replace('|', '_'))).toBeTruthy()
  })

  test('should add a writer to a library and cascade the role to library collections', async () => {
    const containerService =
      DIContainer.sharedContainer.containerService[ContainerType.library]
    await createLibraryCollection()
    await createLibrary('valid-library-id')
    const didAdd = await containerService.addContainerUser(
      validLibrary._id,
      ContainerRole.Writer,
      validUser1._id,
      validUser2
    )

    const collections = await DIContainer.sharedContainer.libraryRepository.getContainedLibraryCollections(
      validLibrary._id
    )

    expect(didAdd).toBeTruthy()
    expect(collections[0].writers.includes(validUser1._id.replace('|', '_'))).toBeTruthy()
    expect(collections[0].inherited!.includes(validUser1._id.replace('|', '_'))).toBeTruthy()
  })

  test('should add a viewer to a library and cascade the role to library collections', async () => {
    const containerService =
      DIContainer.sharedContainer.containerService[ContainerType.library]
    await createLibraryCollection()
    await createLibrary('valid-library-id')
    const didAdd = await containerService.addContainerUser(
      validLibrary._id,
      ContainerRole.Viewer,
      validUser1._id,
      validUser2
    )

    const collections = await DIContainer.sharedContainer.libraryRepository.getContainedLibraryCollections(
      validLibrary._id
    )

    expect(didAdd).toBeTruthy()
    expect(collections[0].viewers.includes(validUser1._id.replace('|', '_'))).toBeTruthy()
    expect(collections[0].inherited!.includes(validUser1._id.replace('|', '_'))).toBeTruthy()
  })
})

describe('containerService - manageUserRole', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true })
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody.email}`,
        name: 'foobar',
        email: validBody.email
      },
      BucketKey.Data
    )
  })

  test('manageUserRole successfully add the managedUser if the secret is provided', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        managedUserId: 'User|valid-user-6@manuscriptsapp.com',
        newRole: ContainerRole.Viewer,
        secret: config.auth.serverSecret
      },
      {
        containerID: 'MPProject:valid-project-id-4'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('manageUserRole should fail if the managedUser is the only owner', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        managedUserId: 'User|valid-user@manuscriptsapp.com',
        newRole: chance.string()
      },
      {
        containerID: 'MPProject:valid-project-id-5'
      }
    )

    expect(response.status).toBe(HttpStatus.FORBIDDEN)
  })

  test('should successfully update user role from writer to viewer', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        managedUserId: 'User|valid-user-3@manuscriptsapp.com',
        newRole: ContainerRole.Viewer
      },
      {
        containerID: 'MPProject:valid-project-id-4'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should successfully update user role from viewer to owner', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        managedUserId: 'User|valid-user-2@manuscriptsapp.com',
        newRole: ContainerRole.Owner
      },
      {
        containerID: 'MPProject:valid-project-id-4'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should successfully update user role from viewer to writer', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        managedUserId: 'User|valid-user-2@manuscriptsapp.com',
        newRole: ContainerRole.Writer
      },
      {
        containerID: 'MPProject:valid-project-id-4'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should successfully remove user role if new role is null', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        managedUserId: 'User|valid-user-2@manuscriptsapp.com',
        newRole: null
      },
      {
        containerID: 'MPProject:valid-project-id-4'
      }
    )

    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should successfully remove invitation if new role is null', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const randomId = chance.integer()

    await DIContainer.sharedContainer.containerInvitationRepository.create(
      {
        _id: `MPContainerInvitation:valid-project-id-${randomId}`,
        invitedUserEmail: 'valid-user-2@manuscriptsapp.com',
        invitingUserID: 'User_invitingUser',
        invitingUserProfile: {
          _id: 'MPUserProfile:invitingUser',
          userID: 'User_invitingUser',
          objectType: 'MPUserProfile',
          bibliographicName: {
            _id: 'MPBibliographicName:valid-bibliographic-name',
            objectType: 'MPBibliographicName',
            given: 'Kavin'
          },
          createdAt: 123,
          updatedAt: 123
        },
        objectType: 'MPContainerInvitation',
        containerID: 'MPProject:valid-project-id-4',
        role: ContainerRole.Writer
      },
      {}
    )

    const beforeInvitation = await DIContainer.sharedContainer.containerInvitationRepository.getById(
      `MPContainerInvitation:valid-project-id-${randomId}`
    )

    expect(beforeInvitation).not.toBeNull()

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        managedUserId: 'User|valid-user-2@manuscriptsapp.com',
        newRole: null
      },
      {
        containerID: 'MPProject:valid-project-id-4'
      }
    )

    const afterInvitation = await DIContainer.sharedContainer.containerInvitationRepository.getById(
      `MPContainerInvitation:valid-project-id-${randomId}`
    )

    expect(afterInvitation).toBeNull()
    expect(response.status).toBe(HttpStatus.OK)
    await DIContainer.sharedContainer.containerInvitationRepository.purge(`MPContainerInvitation:valid-project-id-${randomId}`)
  })
})

describe('ContainerService - getArchive', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true })
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody.email}`,
        name: 'foobar',
        email: validBody.email
      },
      BucketKey.Data
    )
  })

  test('should successfully get archive', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await getArchive(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {},
      {
        containerID: 'MPProject:valid-project-id-2'
      }
    )
    expect(response.status).toBe(HttpStatus.OK)
  })

  test('should successfully get archive if manuscript provided', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await getArchive(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {},
      {
        containerID: 'MPProject:valid-project-id-2',
        manuscriptID: 'MPManuscript:valid-manuscript-id-1'
      }
    )
    expect(response.status).toBe(HttpStatus.OK)
  })
})

describe('ContainerService - accessToken', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true })
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody.email}`,
        name: 'foobar',
        email: validBody.email
      },
      BucketKey.Data
    )
  })

  test('should return the access token', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await accessToken(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: 'MPProject:valid-project-id-2',
        scope: 'jupyterhub'
      }
    )
    expect(response.status).toBe(HttpStatus.OK)
  })
})

describe('ContainerService - pickerBundle', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true, manuscript: true })
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody.email}`,
        name: 'foobar',
        email: validBody.email
      },
      BucketKey.Data
    )
  })

  test('should return html bundle', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const accessTokenResponse: supertest.Response = await accessToken(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: `MPProject:valid-project-id-2`,
        scope: 'file-picker'
      }
    )
    expect(accessTokenResponse.status).toBe(HttpStatus.OK)

    const accessTokenHeader = authorizationHeader(accessTokenResponse.text)
    const pickerBundleResponse: supertest.Response = await pickerBundle(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...accessTokenHeader
      },
      {
        containerType: 'project',
        containerID: `MPProject:valid-project-id-2`,
        manuscriptID: validManuscript._id
      }
    )
    expect(pickerBundleResponse.status).toBe(HttpStatus.OK)
    expect(pickerBundleResponse.get('Content-Type')).toBe('application/zip')
  })
})

describe('ContainerService - addProductionNote', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true, manuscript: true, manuscriptNotes: true })
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody2.email}`,
        name: 'foobar',
        email: validBody2.email
      },
      BucketKey.Data
    )
  })

  test('addProductionNote', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const addProductionNoteResponse: supertest.Response = await addProductionNote(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: `MPProject:valid-project-id-11`,
        manuscriptID: validManuscript1._id
      },{
        content: 'Test content',
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD'
      }
    )
    expect(addProductionNoteResponse.status).toBe(HttpStatus.OK)
    expect(addProductionNoteResponse.body.ok).toBe(true)
    expect(addProductionNoteResponse.body.id).toBeTruthy()
  })

  test('addProductionNote with target', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const addProductionNoteResponse: supertest.Response = await addProductionNote(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: `MPProject:valid-project-id-11`,
        manuscriptID: validManuscript1._id
      },{
        content: 'Test content (reply)',
        target: validNote1._id,
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD'
      }
    )

    expect(addProductionNoteResponse.status).toBe(HttpStatus.OK)
    expect(addProductionNoteResponse.body.ok).toBe(true)
    expect(addProductionNoteResponse.body.id).toBeTruthy()
  })
})

describe('ContainerService - createManuscript', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true, manuscript: true, manuscriptNotes: true, templates: true })
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody2.email}`,
        name: 'foobar',
        email: validBody2.email
      },
      BucketKey.Data
    )
  })

  test('should create a manuscript', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await createManuscript(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: `MPProject:valid-project-id-11`
      }
    )
    expect(response.status).toBe(HttpStatus.OK)
    expect(
      JSON.parse(response.text).id.startsWith('MPManuscript')
    ).toBeTruthy()
  })

  test('should create a manuscript', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await createManuscript(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: `MPProject:valid-project-id-11`
      },
      {
        templateId: 'MPManuscriptTemplate:valid-template-1'
      }
    )
    expect(response.status).toBe(HttpStatus.OK)
    expect(
      JSON.parse(response.text).id.startsWith('MPManuscript')
    ).toBeTruthy()
  })

  test('should create a manuscript', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await createManuscript(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: `MPProject:valid-project-id-11`
      },
      {
        templateId: 'MPManuscriptTemplate:www-zotero-org-styles-nature-genetics-Nature-Genetics-Journal-Publication-Article'
      }
    )
    expect(response.status).toBe(HttpStatus.OK)
    expect(
      JSON.parse(response.text).id.startsWith('MPManuscript')
    ).toBeTruthy()
  })
})

describe('ContainerService - getProductionNotes', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true, manuscript: true, manuscriptNotes: true })
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody2.email}`,
        name: 'foobar',
        email: validBody2.email
      },
      BucketKey.Data
    )
  })

  test('should get a list of notes', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const getProductionNoteResponse: supertest.Response = await getProductionNotes(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: `MPProject:valid-project-id-11`,
        manuscriptID: validManuscript._id
      }
    )
    expect(getProductionNoteResponse.status).toBe(HttpStatus.OK)
    expect(JSON.parse(getProductionNoteResponse.text).length).toBeGreaterThan(0)
  })
})

describe('ContainerService - addExternalFiles', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true, externalFile: true })
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody2.email}`,
        name: 'foobar',
        email: validBody2.email
      },
      BucketKey.Data
    )
  })
  test('should add external files', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const { _id, ...noId } = externalFile
    const externalFilesResponse: supertest.Response = await submitExternalFiles(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        content: [{
          ...noId,
          publicUrl: 'http://exampleUrl.com/path3'
        }]
      }
    )
    expect(externalFilesResponse.status).toBe(HttpStatus.OK)
  })

  test('should update external files', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody2,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)

    const authHeader = authorizationHeader(loginResponse.body.token)
    const { _id, ...noId } = externalFile
    const externalFilesResponse: supertest.Response = await submitExternalFiles(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        content: [noId]
      }
    )
    expect(externalFilesResponse.status).toBe(HttpStatus.OK)
  })
})

describe('ContainerService - getCorrectionStatus', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, corrections: true, projects: true })
  })
  test('should get correction status', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await getCorrectionStatus(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: 'MPProject:valid-project-id-2'
      }
    )
    const status = response.body
    expect(response.status).toBe(HttpStatus.OK)
    expect(status.accepted).toBe(3)
    expect(status.rejected).toBe(1)
    expect(status.proposed).toBe(1)
  })

  test('should return 204 if no corrections found', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)
    const authHeader = authorizationHeader(loginResponse.body.token)
    const response: supertest.Response = await getCorrectionStatus(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },
      {
        containerID: 'MPProject:valid-project-id-4'
      }
    )
    expect(response.status).toBe(HttpStatus.NO_CONTENT)
  })

})

describe('ContainerService - saveSnapshot', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true })
  })
  test('should save snapshot', async () => {
    const loginResponse: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(loginResponse.status).toBe(HttpStatus.OK)
    const authHeader = authorizationHeader(loginResponse.body.token)
    const shacklesService: any = DIContainer.sharedContainer.shacklesService
    shacklesService.createSnapshot = jest.fn(() => {
      return {
        key: 'testKey'
      }
    })
    const saveSnapshotResponse: supertest.Response = await createSnapshot(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      },{
        containerID: 'MPProject:valid-project-id-4'
      }, {
        name: 'testSnap'
      }
    )
    expect(saveSnapshotResponse.status).toBe(HttpStatus.OK)
  })
})
