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

import { Chance } from 'chance'
import '../../../../../utilities/dbMock'
import '../../../../../utilities/configMock'

import { ValidationError } from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { authorizationHeader } from '../../../../../data/fixtures/headers'
import { ContainersController } from '../../../../../../src/Controller/V1/Container/ContainersController'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { ContainerType } from '../../../../../../src/Models/ContainerModels'
import { validProject } from '../../../../../data/fixtures/projects'
import { validJWTToken } from '../../../../../data/fixtures/authServiceUser'
import { UserService } from '../../../../../../src/DomainServices/User/UserService'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('ContainersController - create', () => {
  test('should call containerCreate() with a specified _id', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        _id: 'MPProject:foo'
      },
      params: {
        containerType: 'project'
      }
    }

    containerService.containerCreate = jest.fn(() => {})

    const containersController: ContainersController = new ContainersController()
    await containersController.create(req)

    expect(containerService.containerCreate).toBeCalled()
  })

  test('should call containerCreate()', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {},
      params: {
        containerType: 'project'
      }
    }

    containerService.containerCreate = jest.fn(() => {})

    const containersController: ContainersController = new ContainersController()
    await containersController.create(req)

    expect(containerService.containerCreate).toBeCalled()
  })

  test('should fail if a wrong containerType set', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {},
      params: {
        containerType: 'figure'
      }
    }

    containerService.containerCreate = jest.fn(() => {})

    const containersController: ContainersController = new ContainersController()

    return expect(containersController.create(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('create() should fail if the token is not a bearer token', () => {
    const chance = new Chance()
    const req: any = {
      headers: {
        authorization: chance.string()
      },
      body: {
        _id: 'MPProject:foo'
      },
      params: {
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(containersController.create(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should fail if a non-null _id was passed that is not a string', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        _id: 123
      },
      params: {
        containerType: 'project'
      }
    }

    containerService.containerCreate = jest.fn(() => {})

    const containersController: ContainersController = new ContainersController()

    return expect(containersController.create(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('create should fail if the token is undefined', () => {
    const req: any = {
      headers: {
        authorization: undefined
      },
      body: {
        _id: 'MPProject:foo'
      },
      params: {
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(containersController.create(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('create should fail if the token is array', () => {
    const chance = new Chance()
    const req: any = {
      headers: {
        authorization: [chance.string(), chance.string()]
      },
      body: {
        _id: 'MPProject:foo'
      },
      params: {
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(containersController.create(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('ContainersController - manageUserRole', () => {
  test('should call manageUserRole()', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        managedUserId: chance.string(),
        newRole: chance.string()
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project'
      }
    }

    containerService.manageUserRole = jest.fn(() => {})

    const containersController: ContainersController = new ContainersController()
    await containersController.manageUserRole(req)

    return expect(containerService.manageUserRole).toBeCalled()
  })

  test('manageUserRole should fail if the token is not a bearer token', () => {
    const chance = new Chance()
    const req: any = {
      headers: {
        authorization: chance.string()
      },
      body: {
        managedUserId: chance.string(),
        newRole: chance.string()
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(
      containersController.manageUserRole(req)
    ).rejects.toThrowError(ValidationError)
  })

  test('manageUserRole should fail if the token is undefined', () => {
    const chance = new Chance()
    const req: any = {
      headers: {
        authorization: undefined
      },
      body: {
        managedUserId: chance.string(),
        newRole: chance.string()
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(
      containersController.manageUserRole(req)
    ).rejects.toThrowError(ValidationError)
  })

  test('manageUserRole should fail if the token is array', () => {
    const chance = new Chance()
    const req: any = {
      headers: {
        authorization: [chance.string(), chance.string()]
      },
      body: {
        managedUserId: chance.string(),
        newRole: chance.string()
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(
      containersController.manageUserRole(req)
    ).rejects.toThrowError(ValidationError)
  })

  test('manageUserRole should fail if managedUserId is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        managedUserId: chance.integer(),
        newRole: chance.string()
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(
      containersController.manageUserRole(req)
    ).rejects.toThrowError(ValidationError)
  })

  test('manageUserRole should fail if containerId is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        managedUserId: chance.string(),
        newRole: chance.string()
      },
      params: {
        containerID: 123,
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(
      containersController.manageUserRole(req)
    ).rejects.toThrowError(ValidationError)
  })

  test('manageUserRole should fail if newRole is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        managedUserId: chance.string(),
        newRole: chance.integer()
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(
      containersController.manageUserRole(req)
    ).rejects.toThrowError(ValidationError)
  })
})

describe('ContainersController - addUser', () => {
  test('should call addUser()', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        userId: chance.string(),
        role: chance.string()
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project'
      }
    }

    containerService.addContainerUser = jest.fn(() => {})

    const containersController: ContainersController = new ContainersController()
    await containersController.addUser(req)

    return expect(containerService.addContainerUser).toBeCalled()
  })

  test('addUser should fail if userId is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        userId: chance.integer(),
        role: chance.string()
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(containersController.addUser(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('addUser should fail if containerId is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        userId: chance.string(),
        role: chance.string()
      },
      params: {
        containerID: 123,
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(containersController.addUser(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('addUser should fail if role is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      body: {
        userId: chance.string(),
        role: chance.integer()
      },
      params: {
        containerID: 'MPProject:foo',
        containerType: 'project'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(containersController.addUser(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('ContainersController - delete', () => {
  test('should call deleteContainer()', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      params: {
        containerID: 'MPProject:foo'
      }
    }

    containerService.deleteContainer = jest.fn(() => {})

    const containersController: ContainersController = new ContainersController()
    await containersController.delete(req)

    return expect(containerService.deleteContainer).toBeCalled()
  })

  test('delete should fail if containerID is not a string', () => {
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string()),
      params: {
        containerID: chance.integer()
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(containersController.delete(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('ContainersController - getArchive', () => {
  test('should fail if the containerID is not a string', () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.integer()
      },
      headers: {
        accept: chance.string()
      },
      query: {}
    }

    const containersController: ContainersController = new ContainersController()
    return expect(containersController.getArchive(req)).rejects.toThrowError(ValidationError)
  })

  test('should call getArchive()', async () => {
    const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: 'MPProject:foo'
      },
      headers: {
        accept: chance.string(),
        authorization: 'Bearer ' + chance.string()
      },
      user: {
        _id: chance.integer()
      },
      query: {}
    }

    containerService.getArchive = jest.fn(() => {})

    const containersController: ContainersController = new ContainersController()
    await containersController.getArchive(req)

    return expect(containerService.getArchive).toBeCalled()
  })

  test('should call getArchive() for a specific manuscriptID', async () => {
    const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: 'MPProject:foo',
        manuscriptID: 'MPProject:foo'
      },
      headers: {
        accept: chance.string(),
        authorization: 'Bearer ' + chance.string()
      },
      user: {
        _id: chance.integer()
      },
      query: {}
    }

    containerService.getArchive = jest.fn(() => {})

    const containersController: ContainersController = new ContainersController()
    await containersController.getArchive(req)

    return expect(containerService.getArchive).toBeCalled()
  })
})

describe('ContainerController - accessToken', () => {
  test('should fail if containerID is not string', async () => {
    const req: any = {
      params: {
        containerID: 123,
        scope: 'foobar'
      },
      headers: {
        authorization: 'Bearer ' + new Chance().string()
      },
      user: {
        _id: 'User_bar'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.accessToken(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if scope is not string', async () => {
    const req: any = {
      params: {
        containerID: 'MPProject:foobar',
        scope: 123
      },
      headers: {
        authorization: 'Bearer ' + new Chance().string()
      },
      user: {
        _id: 'User_bar'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.accessToken(req)).rejects.toThrowError(ValidationError)
  })

  test('should call accessToken', async () => {
    const req: any = {
      params: {
        containerID: 'MPProject:foobar',
        scope: 'foobar'
      },
      headers: {
        authorization: 'Bearer ' + new Chance().string()
      },
      user: {
        _id: 'User_bar'
      }
    }

    const containersService =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containersService.accessToken = jest.fn(async () => 'asdasd')

    const containersController = new ContainersController()
    await containersController.accessToken(req)

    return expect(containersService.accessToken).toBeCalledWith(
      req.user._id,
      req.params.scope,
      req.params.containerID
    )
  })
})

describe('ContainerController - jwksForAccessScope', () => {
  test('should fail because containerType should be a string', () => {
    const containersController = new ContainersController()

    const req: any = {
      params: {
        containerType: 123,
        scope: ''
      }
    }

    expect(() => containersController.jwksForAccessScope(req)).toThrowError(
      ValidationError
    )
  })

  test('should fail because scope should be a string', () => {
    const containersController = new ContainersController()

    const req: any = {
      params: {
        scope: 123,
        containerType: ''
      }
    }

    expect(() => containersController.jwksForAccessScope(req)).toThrowError(
      ValidationError
    )
  })
})

describe('ContainersController - getBundle', () => {
  test('should fail if the containerID is not a string', () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.integer()
      },
      headers: {
        accept: chance.string()
      },
      query: {}
    }

    const containersController: ContainersController = new ContainersController()
    const finish = jest.fn()
    return expect(containersController.getBundle(req, finish)).rejects.toThrowError(ValidationError)
  })

  test('should fail if user is not a collaborator', () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getContainer = jest.fn(async (): Promise<any> => validProject)
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: 'MPProject:valid-project-id',
        manuscriptID: 'MPManuscript:valid-manuscript-id-1'
      },
      headers: {
        accept: chance.string()
      },
      query: {},
      user: {
        _id: 'User_invalid'
      }
    }

    const containersController: ContainersController = new ContainersController()
    const finish = jest.fn()
    return expect(containersController.getBundle(req, finish)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the manuscriptID is not a string', () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getContainer = jest.fn(async (): Promise<any> => validProject)
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: 'MPProject:valid-project-id',
        manuscriptID: chance.integer()
      },
      headers: {
        accept: chance.string(),
        authorization: `Bearer ${validJWTToken}`
      },
      query: {},
      user: {
        _id: 'User_test'
      }
    }

    const containersController: ContainersController = new ContainersController()
    const finish = jest.fn()
    return expect(containersController.getBundle(req, finish)).rejects.toThrowError(ValidationError)
  })

  test('should call getBundle', async () => {
    const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]
    const pressroomService = DIContainer.sharedContainer.pressroomService

    containerService.getContainer = jest.fn(async (): Promise<any> => validProject)
    containerService.containerRepository.getById = jest.fn(async (): Promise<any> => validProject)
    DIContainer.sharedContainer.userService.authenticateUser = () => Promise.resolve()
    pressroomService.fetchHtml = jest.fn(async (): Promise<any> => Buffer.from('someData'))

    const chance = new Chance()
    const req: any = {
      params: {
        containerID: 'MPProject:valid-project-id',
        manuscriptID: 'MPManuscript:valid-manuscript-id-1'
      },
      headers: {
        accept: chance.string(),
        authorization: `Bearer ${validJWTToken}`
      },
      query: {},
      user: {
        _id: 'User_test'
      }
    }

    const containersController: ContainersController = new ContainersController()
    const finish = jest.fn()
    await containersController.getBundle(req, finish)
    return expect(finish).toBeCalled()
  })
})

describe('ContainersController - getAttachment', () => {
  test('should fail if the id is not a string', () => {
    const chance = new Chance()
    const req: any = {
      params: {
        id: chance.integer(),
        attachmentKey: chance.string()
      },
      user: {
        _id: 'invalidUser'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(containersController.getAttachment(req)).rejects.toThrowError(ValidationError)
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
              content_type: 'image/png'
            }
          }
        })
      },
      getAttachmentBody: async () => Promise.resolve('body')
    }

    const chance = new Chance()
    const req: any = {
      params: {
        id: chance.string(),
        attachmentKey: 'image'
      },
      user: {
        _id: 'User_test'
      }
    }

    const containersController: ContainersController = new ContainersController()
    return expect(containersController.getAttachment(req)).resolves.toBeTruthy()
  })
})

describe('ContainersController - getProductionNotes', () => {
  test('should fail if containerID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.integer()
      }
    }
    const containersController: ContainersController = new ContainersController()
    await expect(containersController.getProductionNotes(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if manuscriptID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.string(),
        manuscriptID: chance.integer()
      }
    }
    const containersController: ContainersController = new ContainersController()
    await expect(containersController.getProductionNotes(req)).rejects.toThrow(ValidationError)
  })

  test('should to call getProductionNotes', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getProductionNotes = jest.fn()
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: `MPProject:${chance.string()}`,
        manuscriptID: chance.string()
      },
      user: {
        _id: chance.string()
      }
    }
    const containersController: ContainersController = new ContainersController()
    await containersController.getProductionNotes(req)
    expect(containerService.getProductionNotes).toBeCalled()
  })
})

describe('ContainersController - addProductionNote', () => {
  test('should fail if containerID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.integer()
      },
      body: {
        content: chance.integer(),
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD'
      },
      user: {
        _id: chance.string()
      }
    }
    const containersController: ContainersController = new ContainersController()
    await expect(containersController.addProductionNote(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if manuscriptID is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.string(),
        manuscriptID: chance.integer()
      },
      body: {
        content: chance.integer(),
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD'
      },
      user: {
        _id: chance.string()
      }
    }
    const containersController: ContainersController = new ContainersController()
    await expect(containersController.addProductionNote(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if content is not a string', async () => {
    const chance = new Chance()
    const req: any = {
      params: {
        containerID: chance.string(),
        manuscriptID: chance.string()
      },
      body: {
        content: chance.integer(),
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD'
      },
      user: {
        _id: chance.string()
      }
    }
    const containersController: ContainersController = new ContainersController()
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
        manuscriptID: chance.string()
      },
      body: {
        content: 'asdasdasdasd',
        connectUserID: 'valid-connect-user-6-id',
        source: 'DASHBOARD'
      },
      user: {
        _id: 'User_test'
      }
    }
    const containersController: ContainersController = new ContainersController()
    await containersController.addProductionNote(req)
    expect(containerService.createManuscriptNote).toBeCalled()
  })
})
