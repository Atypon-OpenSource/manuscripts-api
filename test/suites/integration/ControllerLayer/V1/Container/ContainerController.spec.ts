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

import { ValidationError } from '../../../../../../src/Errors'
import { ContainersController } from '../../../../../../src/Controller/V1/Container/ContainersController'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { ContainerRole, ContainerType } from '../../../../../../src/Models/ContainerModels'
import { drop, dropBucket, seed, testDatabase } from '../../../../../utilities/db'
import { validJWTToken } from '../../../../../data/fixtures/authServiceUser'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { validManuscript } from '../../../../../data/fixtures/manuscripts'
import { invalidBody, validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { validNote1 } from '../../../../../data/fixtures/ManuscriptNote'
import { UserService } from '../../../../../../src/DomainServices/User/UserService'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase()))
afterAll(() => db.bucket.disconnect())

const chance = new Chance()

describe('ContainersController - create', () => {
  test('create project should fail if the token is not a bearer token', () => {
    const req: any = {
      body: {
        password: chance.string()
      },
      headers: {
        authorization: chance.string()
      },
      params: {
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.create(req)).rejects.toThrowError(ValidationError)
  })

  test('create project should fail if the token is undefined', () => {
    const req: any = {
      body: {
        password: chance.string()
      },
      headers: {
        authorization: undefined
      },
      params: {
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.create(req)).rejects.toThrowError(ValidationError)
  })

  test('create should fail if the container type is invalid', () => {
    const req: any = {
      body: {
        password: chance.string()
      },
      headers: {
        authorization: chance.string()
      },
      params: {
        containerType: 'abc'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.create(req)).rejects.toThrowError(ValidationError)
  })

  test('create project should fail if the token is not a bearer token', () => {
    const req: any = {
      body: {
        password: chance.string()
      },
      headers: {
        authorization: [chance.string(), chance.string()]
      },
      params: {
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.create(req)).rejects.toThrowError(ValidationError)
  })

  test('create project should fail if the _id is not a string', () => {
    const req: any = {
      body: {
        password: chance.string(),
        _id: chance.integer()
      },
      headers: {
        authorization: chance.string()
      },
      params: {
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.create(req)).rejects.toThrowError(ValidationError)
  })
})

describe('ContainersController - manageUserRole', () => {
  test('should fail if the managedUserId is undefined', () => {
    const req: any = {
      body: {
        newRole: ContainerRole.Owner
      },
      headers: {
        authorization: chance.string()
      },
      params: {
        containerID: chance.string(),
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.manageUserRole(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the managedUserId is not a string', () => {
    const req: any = {
      body: {
        newRole: ContainerRole.Owner,
        managedUserId: chance.integer()
      },
      headers: {
        authorization: chance.string()
      },
      params: {
        containerID: chance.string(),
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.manageUserRole(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the containerId is undefined', () => {
    const req: any = {
      body: {
        newRole: ContainerRole.Owner,
        managedUserId: chance.string()
      },
      headers: {
        authorization: chance.string()
      },
      params: {}
    }

    const containersController = new ContainersController()
    return expect(containersController.manageUserRole(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the containerId is not a string', () => {
    const req: any = {
      body: {
        newRole: ContainerRole.Owner,
        managedUserId: chance.string()
      },
      headers: {
        authorization: chance.string()
      },
      params: {
        containerID: chance.integer(),
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.manageUserRole(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the role is not a string', () => {
    const req: any = {
      body: {
        newRole: chance.integer(),
        managedUserId: chance.string()
      },
      headers: {
        authorization: chance.string()
      },
      params: {
        containerID: chance.string(),
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.manageUserRole(req)).rejects.toThrowError(ValidationError)
  })
})

describe('ContainersController - addUser', () => {
  test('should fail if the userId is not a string', () => {
    const req: any = {
      body: {
        role: ContainerRole.Owner,
        userId: chance.integer()
      },
      headers: {
        authorization: chance.string()
      },
      params: {
        containerID: chance.string(),
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.addUser(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the containerId is not a string', () => {
    const req: any = {
      body: {
        role: ContainerRole.Owner,
        userId: chance.string()
      },
      headers: {
        authorization: chance.string()
      },
      params: {
        containerID: chance.integer(),
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.addUser(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the role is not a string', () => {
    const req: any = {
      body: {
        role: chance.integer(),
        userId: chance.string()
      },
      headers: {
        authorization: chance.string()
      },
      params: {
        containerID: chance.string(),
        containerType: 'project'
      }
    }

    const containersController = new ContainersController()
    return expect(containersController.addUser(req)).rejects.toThrowError(ValidationError)
  })
})

describe('ContainerController - getArchive', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true })
  })

  test('should fail if the containerID is not a string', () => {
    const req: any = {
      params: {
        containerID: chance.integer()
      },
      headers: {
        accept: chance.string()
      },
      query: {}
    }

    const containersController = new ContainersController()
    return expect(containersController.getArchive(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if user is not contributor', () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.authenticateUser = async () => Promise.resolve()

    const req: any = {
      params: {
        containerID: 'MPProject:valid-project-id'
      },
      headers: {
        accept: chance.string(),
        authorization: `Bearer ${validJWTToken}`
      },
      user: {
        _id: 'invalidUser'
      },
      query: {}
    }

    const containersController = new ContainersController()
    return expect(containersController.getArchive(req)).rejects.toThrowError(ValidationError)
  })
})

describe('ContainerController - getAttachment', () => {
  test('should fail if the id is not a string', () => {
    const req: any = {
      params: {
        id: chance.integer()
      },
      headers: {
        accept: chance.string()
      },
      query: {}
    }

    const containersController = new ContainersController()
    return expect(containersController.getAttachment(req)).rejects.toThrowError(ValidationError)
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

  test('should fail because publicKeyJWK is null', () => {
    const containersController = new ContainersController()

    const req: any = {
      params: {
        scope: 'pressroom',
        containerType: ContainerType.project
      }
    }

    expect(() => containersController.jwksForAccessScope(req)).toThrowError(
      ValidationError
    )
  })
})

describe('ContainerController - accessToken', () => {
  test('should fail because containerType should be a string', () => {
    const containersController = new ContainersController()

    const req: any = {
      params: {
        containerType: 123,
        scope: 'something'
      }
    }

    return expect(containersController.accessToken(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should fail because scope should be a string', () => {
    const containersController = new ContainersController()

    const req: any = {
      params: {
        scope: 123,
        containerType: 'something'
      }
    }

    return expect(containersController.accessToken(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('ContainerController - getBundle', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true })
  })

  test('should fail if the containerID is not a string', () => {
    const req: any = {
      params: {
        containerID: 123
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

  test('should fail if user is not a contributor', () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.authenticateUser = async () => Promise.resolve()
    const req: any = {
      params: {
        containerID: 'MPProject:valid-project-id-2',
        manuscriptID: 'MPManuscript:valid-manuscript-id-1'
      },
      headers: {
        accept: chance.string()
      },
      query: {},
      user: {
        _id: `User_${invalidBody.email}`
      }
    }

    const containersController: ContainersController = new ContainersController()
    const finish = jest.fn()
    return expect(containersController.getBundle(req, finish)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the manuscriptID is not a string', () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.authenticateUser = async () => Promise.resolve()
    const req: any = {
      params: {
        containerID: `MPProject:valid-project-id-2`,
        manuscriptID: validManuscript._id
      },
      headers: {
        accept: chance.string(),
        authorization: `Bearer ${validJWTToken}`
      },
      query: {},
      user: {
        _id: `User_${invalidBody.email}`
      }
    }

    const containersController: ContainersController = new ContainersController()
    const finish = jest.fn()
    return expect(containersController.getBundle(req, finish)).rejects.toThrowError(ValidationError)
  })
})

describe('ContainerController - getProductionNotes', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true, manuscript: true, manuscriptNotes: true })
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody.email}`,
        name: 'foobar',
        email: validBody.email
      },
      BucketKey.Data
    )
  })

  test('should fail if the containerID is not a string', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getProductionNotes = jest.fn()
    const req: any = {
      params: {
        containerID: chance.integer()
      },
      user: {
        _id: `User_${validBody.email}`
      }
    }
    await expect(new ContainersController().getProductionNotes(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if the manuscriptID is not a string', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getProductionNotes = jest.fn()
    const req: any = {
      params: {
        containerID: validNote1.containerID,
        manuscriptID: chance.integer()
      },
      user: {
        _id: `User_${validBody.email}`
      }
    }
    await expect(new ContainersController().getProductionNotes(req)).rejects.toThrow(ValidationError)
  })

  test('should call getProductionNotes', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getProductionNotes = jest.fn()
    const req: any = {
      params: {
        containerID: validNote1.containerID,
        manuscriptID: validNote1.manuscriptID
      },
      user: {
        _id: `User_${validBody.email}`
      }
    }
    await new ContainersController().getProductionNotes(req)
    expect(containerService.getProductionNotes).toBeCalled()
  })
})

describe('ContainerController - addProductionNotes', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true, projects: true, manuscript: true, manuscriptNotes: true })
    await DIContainer.sharedContainer.syncService.createGatewayContributor(
      {
        _id: `User|${validBody.email}`,
        name: 'foobar',
        email: validBody.email
      },
      BucketKey.Data
    )
  })

  test('should fail if the containerID is not a string', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.createManuscriptNote = jest.fn()
    const req: any = {
      params: {
        containerID: chance.integer()
      },
      user: {
        _id: `User_${validBody.email}`
      },
      body: {
        content: 'test content'
      }
    }
    await expect(new ContainersController().addProductionNote(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if the manuscriptID is not a string', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.createManuscriptNote = jest.fn()
    const req: any = {
      params: {
        containerID: validNote1.containerID,
        manuscriptID: chance.integer()
      },
      user: {
        _id: `User_${validBody.email}`
      },
      body: {
        content: 'test content'
      }
    }
    await expect(new ContainersController().addProductionNote(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if the content is not a string', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.createManuscriptNote = jest.fn()
    const req: any = {
      params: {
        containerID: validNote1.containerID,
        manuscriptID: validNote1.manuscriptID
      },
      user: {
        _id: `User_${validBody.email}`
      },
      body: {
        content: chance.integer()
      }
    }
    await expect(new ContainersController().addProductionNote(req)).rejects.toThrow(ValidationError)
  })

  test('should call createManuscriptNote', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.createManuscriptNote = jest.fn()
    UserService.profileID = jest.fn()
    const req: any = {
      params: {
        containerID: validNote1.containerID,
        manuscriptID: validNote1.manuscriptID
      },
      user: {
        _id: 'User_test'
      },
      body: {
        content: 'test content'
      }
    }
    await new ContainersController().addProductionNote(req)
    expect(containerService.createManuscriptNote).toBeCalled()
  })
})
