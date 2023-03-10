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

import '../../../../../utilities/dbMock'
import '../../../../../utilities/configMock'

import { Chance } from 'chance'

import { ProjectController } from '../../../../../../src/Controller/V1/Project/ProjectController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { UserService } from '../../../../../../src/DomainServices/User/UserService'
import { ValidationError } from '../../../../../../src/Errors'
import { ContainerType } from '../../../../../../src/Models/ContainerModels'
import { validJWTToken } from '../../../../../data/fixtures/authServiceUser'
import { authorizationHeader } from '../../../../../data/fixtures/headers'
import { validProject } from '../../../../../data/fixtures/projects'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('ProjectController - create', () => {
  test('should call createContainer() with a specified _id', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        _id: 'MPProject:foo',
      },
      params: {
        containerType: 'project',
      },
    }

    containerService.createContainer = jest.fn(() => {})

    const containersController: ProjectController = new ProjectController()
    await containersController.create(req)

    expect(containerService.createContainer).toHaveBeenCalled()
  })

  test('should call createContainer()', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {},
      params: {
        containerType: 'project',
      },
    }

    containerService.createContainer = jest.fn(() => {})

    const containersController: ProjectController = new ProjectController()
    await containersController.create(req)

    expect(containerService.createContainer).toHaveBeenCalled()
  })

  test('should fail if a wrong containerType set', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {},
      params: {
        containerType: 'figure',
      },
    }

    containerService.createContainer = jest.fn(() => {})

    const containersController: ProjectController = new ProjectController()

    return expect(containersController.create(req)).rejects.toThrow(ValidationError)
  })

  test('create() should fail if the token is not a bearer token', () => {
    const chance = new Chance()
    const req: any = {
      headers: {
        authorization: chance.string(),
      },
      body: {
        _id: 'MPProject:foo',
      },
      params: {
        containerType: 'project',
      },
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.create(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if a non-null _id was passed that is not a string', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        _id: 123,
      },
      params: {
        containerType: 'project',
      },
    }

    containerService.createContainer = jest.fn(() => {})

    const containersController: ProjectController = new ProjectController()

    return expect(containersController.create(req)).rejects.toThrow(ValidationError)
  })

  test('create should fail if the token is undefined', () => {
    const req: any = {
      headers: {
        authorization: undefined,
      },
      body: {
        _id: 'MPProject:foo',
      },
      params: {
        containerType: 'project',
      },
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.create(req)).rejects.toThrow(ValidationError)
  })

  test('create should fail if the token is array', () => {
    const chance = new Chance()
    const req: any = {
      headers: {
        authorization: [chance.string(), chance.string()],
      },
      body: {
        _id: 'MPProject:foo',
      },
      params: {
        containerType: 'project',
      },
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.create(req)).rejects.toThrow(ValidationError)
  })
})

describe('ProjectController - manageUserRole', () => {
  test('should call manageUserRole()', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        managedUserId: chance.string(),
        newRole: chance.string(),
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project',
      },
      user: validUser,
    }

    containerService.manageUserRole = jest.fn(() => {})

    const containersController: ProjectController = new ProjectController()
    await containersController.manageUserRole(req)

    return expect(containerService.manageUserRole).toHaveBeenCalled()
  })

  test('manageUserRole should fail if managedUserId is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        managedUserId: chance.integer(),
        newRole: chance.string(),
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project',
      },
      user: validUser,
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.manageUserRole(req)).rejects.toThrow(ValidationError)
  })

  test('manageUserRole should fail if containerId is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        managedUserId: chance.string(),
        newRole: chance.string(),
      },
      params: {
        containerID: 123,
        containerType: 'project',
      },
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.manageUserRole(req)).rejects.toThrow(ValidationError)
  })

  test('manageUserRole should fail if newRole is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        managedUserId: chance.string(),
        newRole: chance.integer(),
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project',
      },
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.manageUserRole(req)).rejects.toThrow(ValidationError)
  })

  test('manageUserRole should fail if secret is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        managedUserId: chance.string(),
        newRole: 'Viewer',
        secret: chance.integer(),
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project',
      },
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.manageUserRole(req)).rejects.toThrow(ValidationError)
  })
})

describe('ProjectController - addUser', () => {
  test('should call addUser()', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        userId: chance.string(),
        role: chance.string(),
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project',
      },
      user: validUser,
    }

    containerService.addContainerUser = jest.fn(() => {})

    const containersController: ProjectController = new ProjectController()
    await containersController.addUser(req)

    return expect(containerService.addContainerUser).toHaveBeenCalled()
  })

  test('addUser should fail if userId is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        userId: chance.integer(),
        role: chance.string(),
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project',
      },
      user: validUser,
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.addUser(req)).rejects.toThrow(ValidationError)
  })

  test('addUser should fail if containerId is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        userId: chance.string(),
        role: chance.string(),
      },
      params: {
        containerID: 123,
        containerType: 'project',
      },
      user: validUser,
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.addUser(req)).rejects.toThrow(ValidationError)
  })

  test('addUser should fail if role is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        userId: chance.string(),
        role: chance.integer(),
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project',
      },
      user: validUser,
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.addUser(req)).rejects.toThrow(ValidationError)
  })
})

describe('ProjectController - delete', () => {
  test('should call deleteContainer()', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      params: {
        containerID: 'MPProject:foo',
      },
      user: validUser,
    }

    containerService.deleteContainer = jest.fn(() => {})

    const containersController: ProjectController = new ProjectController()
    await containersController.delete(req)

    return expect(containerService.deleteContainer).toHaveBeenCalled()
  })

  test('delete should fail if containerID is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      params: {
        containerID: chance.integer(),
      },
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.delete(req)).rejects.toThrow(ValidationError)
  })
})

describe('ProjectController - getArchive', () => {
  test('should fail if the containerID is not a string', () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.integer(),
      },
      headers: {
        accept: chance.string(),
      },
      query: {},
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.getArchive(req)).rejects.toThrow(ValidationError)
  })

  test('should call getArchive()', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: 'MPProject:foo',
      },
      headers: {
        accept: chance.string(),
        authorization: 'Bearer ' + chance.string(),
      },
      user: {
        _id: chance.integer(),
      },
      query: {},
    }

    containerService.getArchive = jest.fn(() => {})

    const containersController: ProjectController = new ProjectController()
    await containersController.getArchive(req)

    return expect(containerService.getArchive).toHaveBeenCalled()
  })

  test('should call getArchive() for a specific manuscriptID', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: 'MPProject:foo',
        manuscriptID: 'MPProject:foo',
      },
      headers: {
        accept: chance.string(),
        authorization: 'Bearer ' + chance.string(),
      },
      user: {
        _id: chance.integer(),
      },
      query: {},
    }

    containerService.getArchive = jest.fn(() => {})

    const containersController: ProjectController = new ProjectController()
    await containersController.getArchive(req)

    return expect(containerService.getArchive).toHaveBeenCalled()
  })
})

describe('ContainerController - loadProject', () => {
  test('should call loadProject()', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      params: {
        projectId: 'MPProject:foo',
      },
      headers: {
        accept: chance.string(),
        authorization: 'Bearer ' + chance.string(),
      },
      user: {
        _id: chance.integer(),
      },
      body: {},
      query: {},
    }

    containerService.loadProject = jest.fn(() => Promise.resolve())
    containerService.getContainer = jest.fn(() => Promise.resolve({ _id: 'someId' }))

    const containersController: ProjectController = new ProjectController()
    await containersController.loadProject(req)

    return expect(containerService.loadProject).toHaveBeenCalled()
  })

  test('should fail to loadProject if projectId is not provided', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      params: {
        projectId: null,
      },
      headers: {
        accept: chance.string(),
        authorization: 'Bearer ' + chance.string(),
      },
      user: {
        _id: chance.integer(),
      },
      body: {},
      query: {},
    }

    containerService.loadProject = jest.fn(() => Promise.resolve())
    containerService.getContainer = jest.fn(() => Promise.resolve({ _id: 'someId' }))

    const containersController: ProjectController = new ProjectController()
    await expect(containersController.loadProject(req)).rejects.toThrow(ValidationError)
  })
  test('should return NOT_MODIFIED', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      params: {
        projectId: 'MPProject:foo',
      },
      headers: {
        accept: chance.string(),
        authorization: 'Bearer ' + chance.string(),
        'if-modified-since': new Date().toUTCString(),
      },
      user: {
        _id: chance.integer(),
      },
      body: {},
      query: {},
    }

    containerService.loadProject = jest.fn(() => Promise.resolve())
    containerService.getContainer = jest.fn(() => Promise.resolve({ updatedAt: 10 }))

    const containersController: ProjectController = new ProjectController()
    const res = await containersController.loadProject(req)
    expect(res.status).toBe(304)
  })
})

describe('ContainerController - accessToken', () => {
  test('should fail if containerID is not string', async () => {
    const req: any = {
      params: {
        containerID: 123,
        scope: 'foobar',
      },
      headers: {
        authorization: 'Bearer ' + new Chance().string(),
      },
      user: {
        _id: 'User_bar',
      },
    }

    const containersController = new ProjectController()
    return expect(containersController.accessToken(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if scope is not string', async () => {
    const req: any = {
      params: {
        containerID: 'MPProject:foobar',
        scope: 123,
      },
      headers: {
        authorization: 'Bearer ' + new Chance().string(),
      },
      user: {
        _id: 'User_bar',
      },
    }

    const containersController = new ProjectController()
    return expect(containersController.accessToken(req)).rejects.toThrow(ValidationError)
  })

  test('should call accessToken', async () => {
    const req: any = {
      params: {
        containerID: 'MPProject:foobar',
        scope: 'foobar',
      },
      headers: {
        authorization: 'Bearer ' + new Chance().string(),
      },
      user: {
        _id: 'User_bar',
      },
    }

    const containersService = DIContainer.sharedContainer.containerService[ContainerType.project]

    containersService.accessToken = jest.fn(async () => 'asdasd')

    const containersController = new ProjectController()
    await containersController.accessToken(req)

    return expect(containersService.accessToken).toHaveBeenCalledWith(
      req.user._id,
      req.params.scope,
      req.params.containerID
    )
  })
})

describe('ContainerController - jwksForAccessScope', () => {
  test('should fail because containerType should be a string', () => {
    const containersController = new ProjectController()

    const req: any = {
      params: {
        containerType: 123,
        scope: '',
      },
    }

    expect(() => containersController.jwksForAccessScope(req)).toThrow(ValidationError)
  })

  test('should fail because scope should be a string', () => {
    const containersController = new ProjectController()

    const req: any = {
      params: {
        scope: 123,
        containerType: '',
      },
    }

    expect(() => containersController.jwksForAccessScope(req)).toThrow(ValidationError)
  })

  test('should fail if publicKeyJWK is null', () => {
    const containersController = new ProjectController()
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.findScope = jest.fn(() => Promise.resolve({ publicKeyJWK: null }))
    const req: any = {
      params: {
        containerType: 123,
        scope: '',
      },
    }

    expect(() => containersController.jwksForAccessScope(req)).toThrow(ValidationError)
  })
})

describe('ProjectController - getBundle', () => {
  test('should fail if the containerID is not a string', () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.integer(),
      },
      headers: {
        accept: chance.string(),
      },
      query: {},
    }

    const containersController: ProjectController = new ProjectController()
    const finish = jest.fn()
    return expect(containersController.getBundle(req, finish)).rejects.toThrow(ValidationError)
  })

  test('should fail if user is not a collaborator', () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getContainer = jest.fn(async (): Promise<any> => validProject)
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: 'MPProject:valid-project-id',
        manuscriptID: 'MPManuscript:valid-manuscript-id-1',
      },
      headers: {
        accept: chance.string(),
      },
      query: {},
      user: {
        _id: 'User_invalid',
      },
    }

    const containersController: ProjectController = new ProjectController()
    const finish = jest.fn()
    return expect(containersController.getBundle(req, finish)).rejects.toThrow(ValidationError)
  })

  test('should fail if the manuscriptID is not a string', () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getContainer = jest.fn(async (): Promise<any> => validProject)
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: 'MPProject:valid-project-id',
        manuscriptID: chance.integer(),
      },
      headers: {
        accept: chance.string(),
        authorization: `Bearer ${validJWTToken}`,
      },
      query: {},
      user: {
        _id: 'User_test',
      },
    }

    const containersController: ProjectController = new ProjectController()
    const finish = jest.fn()
    return expect(containersController.getBundle(req, finish)).rejects.toThrow(ValidationError)
  })

  test('should call getBundle', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const pressroomService = DIContainer.sharedContainer.pressroomService

    containerService.getContainer = jest.fn(async (): Promise<any> => validProject)
    containerService.containerRepository.getById = jest.fn(async (): Promise<any> => validProject)
    DIContainer.sharedContainer.userService.authenticateUser = () => Promise.resolve()
    pressroomService.fetchHtml = jest.fn(async (): Promise<any> => Buffer.from('someData'))

    const chance = new Chance()
    const req: any = {
      params: {
        containerID: 'MPProject:valid-project-id',
        manuscriptID: 'MPManuscript:valid-manuscript-id-1',
      },
      headers: {
        accept: chance.string(),
        authorization: `Bearer ${validJWTToken}`,
      },
      query: {},
      user: {
        _id: 'User_test',
      },
    }

    const containersController: ProjectController = new ProjectController()
    const finish = jest.fn()
    await containersController.getBundle(req, finish)
    return expect(finish).toHaveBeenCalled()
  })
})

describe('ProjectController - getAttachment', () => {
  test('should fail if the id is not a string', () => {
    const chance = new Chance()
    const req: any = {
      params: {
        id: chance.integer(),
        attachmentKey: chance.string(),
      },
      user: {
        _id: 'invalidUser',
      },
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.getAttachment(req)).rejects.toThrow(ValidationError)
  })

  test('should call getAttachment', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => {
        return Promise.resolve({
          _id: 'MPFigure:12345',
          containerID: 'MPProject',
          viewers: [],
          owners: ['User_test'],
          writers: [],
          _attachments: {
            image: {
              content_type: 'image/png',
            },
          },
        })
      },
      getAttachmentBody: async () => Promise.resolve('body'),
    }

    const chance = new Chance()
    const req: any = {
      params: {
        id: chance.string(),
        attachmentKey: 'image',
      },
      user: {
        _id: 'User_test',
      },
    }

    const containersController: ProjectController = new ProjectController()
    return expect(containersController.getAttachment(req)).resolves.toBeTruthy()
  })
})

describe('ProjectController - getProductionNotes', () => {
  test('should fail if containerID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.integer(),
      },
    }
    const containersController: ProjectController = new ProjectController()
    await expect(containersController.getProductionNotes(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if manuscriptID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.string(),
        manuscriptID: chance.integer(),
      },
    }
    const containersController: ProjectController = new ProjectController()
    await expect(containersController.getProductionNotes(req)).rejects.toThrow(ValidationError)
  })

  test('should to call getProductionNotes', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getProductionNotes = jest.fn()
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: `MPProject:${chance.string()}`,
        manuscriptID: chance.string(),
      },
      user: {
        _id: chance.string(),
      },
    }
    const containersController: ProjectController = new ProjectController()
    await containersController.getProductionNotes(req)
    expect(containerService.getProductionNotes).toHaveBeenCalled()
  })
})

describe('ProjectController - createManuscript', () => {
  test('should fail if containerID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.integer(),
      },
      body: {},
    }
    const containersController: ProjectController = new ProjectController()
    await expect(containersController.createManuscript(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if containerID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.string(),
      },
      body: {
        templateId: chance.integer(),
      },
    }
    const containersController: ProjectController = new ProjectController()
    await expect(containersController.createManuscript(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if manuscriptID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.string(),
        manuscriptID: chance.integer(),
      },
      body: {},
    }
    const containersController: ProjectController = new ProjectController()
    await expect(containersController.createManuscript(req)).rejects.toThrow(ValidationError)
  })

  test('should succeed to call createManuscript', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.createManuscript = jest.fn()
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: `MPProject:${chance.string()}`,
        manuscriptID: chance.string(),
      },
      user: {
        _id: chance.string(),
      },
      body: {},
    }
    const containersController: ProjectController = new ProjectController()
    await containersController.createManuscript(req)
    expect(containerService.createManuscript).toHaveBeenCalled()
  })
})

describe('ProjectController - addProductionNote', () => {
  test('should fail if containerID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.integer(),
      },
      body: {
        content: chance.integer(),
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD',
      },
      user: {
        _id: chance.string(),
      },
    }
    const containersController: ProjectController = new ProjectController()
    await expect(containersController.addProductionNote(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if manuscriptID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.string(),
        manuscriptID: chance.integer(),
      },
      body: {
        content: chance.integer(),
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD',
      },
      user: {
        _id: chance.string(),
      },
    }
    const containersController: ProjectController = new ProjectController()
    await expect(containersController.addProductionNote(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if content is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.string(),
        manuscriptID: chance.string(),
      },
      body: {
        content: chance.integer(),
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD',
      },
      user: {
        _id: chance.string(),
      },
    }
    const containersController: ProjectController = new ProjectController()
    await expect(containersController.addProductionNote(req)).rejects.toThrow(ValidationError)
  })

  test('should to call addProductionNote', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    UserService.profileID = jest.fn()
    containerService.createManuscriptNote = jest.fn()
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: `MPProject:${chance.string()}`,
        manuscriptID: chance.string(),
      },
      body: {
        content: 'asdasdasdasd',
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD',
      },
      user: {
        _id: 'User_test',
      },
    }
    const containersController: ProjectController = new ProjectController()
    await containersController.addProductionNote(req)
    expect(containerService.createManuscriptNote).toHaveBeenCalled()
  })
})
