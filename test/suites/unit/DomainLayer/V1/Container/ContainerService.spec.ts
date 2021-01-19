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
import * as jsonwebtoken from 'jsonwebtoken'
import '../../../../../utilities/dbMock'
import '../../../../../utilities/configMock'

import {
  UnexpectedUserStatusError,
  InvalidCredentialsError,
  UserBlockedError,
  UserNotVerifiedError,
  ValidationError,
  UserRoleError,
  RecordNotFoundError,
  InvalidScopeNameError
} from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  validUser1,
  validUserProfile
} from '../../../../../data/fixtures/UserRepository'
import {
  validUserStatus,
  validJWTToken
} from '../../../../../data/fixtures/authServiceUser'
import {
  blockedStatus,
  notVerifiedStatus
} from '../../../../../data/fixtures/userStatus'
import {
  ContainerRole,
  ContainerType
} from '../../../../../../src/Models/ContainerModels'
import {
  validProject,
  validProject2,
  validProject5,
  validProject4,
  validProject7
} from '../../../../../data/fixtures/projects'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { validManuscript } from '../../../../../data/fixtures/manuscripts'
import { validNote1, validNote2 } from '../../../../../data/fixtures/ManuscriptNote'
import { validBody2 } from '../../../../../data/fixtures/credentialsRequestPayload'
const JSZip = require('jszip')

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

const chance = new Chance()
describe('containerService - containerCreate', () => {
  test('should fail if the token is incorrect', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()

    return expect(
      containerService.containerCreate(chance.string())
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if user does not exist in the DB', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.userRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerService.containerCreate(validJWTToken)
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if user status does not exist in the DB', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1)
    }

    containerService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    return expect(
      containerService.containerCreate(validJWTToken)
    ).rejects.toThrowError(UnexpectedUserStatusError)
  })

  test('should fail if user is blocked', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1)
    }

    containerService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(blockedStatus),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    return expect(
      containerService.containerCreate(validJWTToken)
    ).rejects.toThrowError(UserBlockedError)
  })

  test('should fail if user is not verified', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1)
    }

    containerService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(notVerifiedStatus),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    return expect(
      containerService.containerCreate(validJWTToken)
    ).rejects.toThrowError(UserNotVerifiedError)
  })

  test('should create a project', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1)
    }

    containerService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      userStatusId: (id: string) => `UserStatus|${id}`
    }

    containerService.containerRepository = {
      create: jest.fn()
    }

    await containerService.containerCreate(validJWTToken)
    expect(containerService.containerRepository.create).toBeCalled()
  })

  test('should create the project with a specified _id', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1)
    }

    containerService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      userStatusId: (id: string) => `UserStatus|${id}`
    }

    containerService.containerRepository = {
      create: jest.fn()
    }

    await containerService.containerCreate(validJWTToken, { _id: 'foo' })
    expect(containerService.containerRepository.create).toBeCalled()
  })
})

describe('containerService - deleteContainer', () => {
  test('should fail if container id is invalid', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerService.deleteContainer(chance.guid(), { _id: chance.guid() })
    ).rejects.toThrowError(RecordNotFoundError)
  })

  test('should fail if user is not an owner', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve({ owners: [] })
    }

    return expect(
      containerService.deleteContainer(chance.guid(), { _id: `User|${chance.guid()}` })
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should delete a project', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve({ owners: [ 'User_123abc123abc' ] }),
      removeWithAllResources: jest.fn()
    }

    await containerService.deleteContainer(chance.guid(), { _id: 'User|123abc123abc' })
    expect(containerService.containerRepository.removeWithAllResources).toBeCalled()
  })
})

describe('containerService - addContainerUser', () => {
  test('should fail if the project is not in the db', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerService.addContainerUser(
        chance.string(),
        ContainerRole.Writer,
        'User|userId',
        {}
      )
    ).rejects.toThrowError(RecordNotFoundError)
  })

  test('should fail if the added user is not in the database', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve({ _id: 'project', viewers: [] })
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerService.addContainerUser(
        chance.string(),
        ContainerRole.Viewer,
        'User|userId',
        {}
      )
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if wrong role assigned', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve({ _id: 'project', viewers: [] })
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({})
    }

    return expect(
      containerService.addContainerUser(
        chance.string(),
        'striker',
        'User|userId',
        {}
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('should update the project owners', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          owners: [],
          writers: [],
          viewers: []
        }),
      patch: jest.fn()
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({})
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    await containerService.addContainerUser(
      'project',
      ContainerRole.Owner,
      'User|userId'
    )
    return expect(containerService.containerRepository.patch).toBeCalled()
  })

  test('should update the project writers', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          writers: [],
          owners: [],
          viewers: []
        }),
      patch: jest.fn()
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({})
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    await containerService.addContainerUser(
      'project',
      ContainerRole.Writer,
      'User|userId'
    )
    return expect(containerService.containerRepository.patch).toBeCalled()
  })

  test('should update the project viewers', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          viewers: [],
          owners: [],
          writers: []
        }),
      patch: jest.fn()
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({})
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    await containerService.addContainerUser(
      'project',
      ContainerRole.Viewer,
      'User|userId'
    )
    return expect(containerService.containerRepository.patch).toBeCalled()
  })

  test('should fail with InvalidCredentailsError if the user is malformed', async () => {
    const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]
    return expect(containerService.getValidUser('User|foo')).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail with a TypeError if the value is null', async () => {
    const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]
    return expect(containerService.getValidUser(null)).rejects.toThrowError(TypeError)
  })

  test('should fail if user id is not started with User_', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve({ _id: 'project', viewers: [] })
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({})
    }

    return expect(
      containerService.addContainerUser(
        'project',
        ContainerRole.Viewer,
        'userId'
      )
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should return false if the user already exists in the project', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          viewers: [],
          owners: [],
          writers: ['User_userId']
        }),
      patch: jest.fn()
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({})
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    return expect(
      await containerService.addContainerUser(
        'project',
        ContainerRole.Viewer,
        'User|userId'
      )
    ).toBeFalsy()
  })

  test('should send email to the added user', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          writers: [],
          owners: ['User_userId90'],
          viewers: []
        }),
      patch: jest.fn()
    }

    containerService.userRepository = {
      getById: async () =>
        Promise.resolve({ _id: 'User|userId', email: 'userId@example.com' })
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    await containerService.addContainerUser(
      'project',
      ContainerRole.Writer,
      'User|userId',
      { _id: 'User|userId90' }
    )

    expect(
      containerService.emailService.sendContainerInvitationAcceptance
    ).toHaveBeenCalledTimes(1)

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    await containerService.addContainerUser(
      'project',
      ContainerRole.Viewer,
      'User|userId',
      { _id: 'User|userId90' }
    )

    expect(
      containerService.emailService.sendContainerInvitationAcceptance
    ).toHaveBeenCalledTimes(1)
  })

  test('should send email to the added user even if the adding user is null', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          writers: [],
          owners: ['User_userId90'],
          viewers: []
        }),
      patch: jest.fn()
    }

    containerService.userRepository = {
      getById: async () =>
        Promise.resolve({ _id: 'User|userId', email: 'userId@example.com' })
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    await containerService.addContainerUser(
      'project',
      ContainerRole.Writer,
      'User|userId',
      null
    )
    expect(
      containerService.emailService.sendContainerInvitationAcceptance
    ).toHaveBeenCalledTimes(1)

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    await containerService.addContainerUser(
      'project',
      ContainerRole.Viewer,
      'User|userId',
      null
    )
    expect(
      containerService.emailService.sendContainerInvitationAcceptance
    ).toHaveBeenCalledTimes(1)
    expect(
      containerService.emailService.sendOwnerNotificationOfCollaborator
    ).toHaveBeenCalledTimes(1)
  })

  test('should send email to the added user and to two owners', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          writers: [],
          owners: ['User_userId90', 'User_userId11'],
          viewers: []
        }),
      patch: jest.fn()
    }

    containerService.userRepository = {
      getById: async () =>
        Promise.resolve({ _id: 'User|userId', email: 'userId@example.com' })
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    await containerService.addContainerUser(
      'project',
      ContainerRole.Writer,
      'User|userId',
      { _id: 'User|userId90' }
    )
    expect(
      containerService.emailService.sendContainerInvitationAcceptance
    ).toHaveBeenCalledTimes(1)
    expect(
      containerService.emailService.sendOwnerNotificationOfCollaborator
    ).toHaveBeenCalledTimes(1)
  })

  test('should send email to the added user and to all other owners of the project', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          writers: [],
          owners: ['User_userId90', 'User_userId99', 'User_userId77'],
          viewers: ['User|userId']
        }),
      patch: async () => Promise.resolve()
    }

    containerService.userRepository = {
      getById: async () =>
        Promise.resolve({ _id: 'User|userId', email: 'userId@example.com' })
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    await containerService.addContainerUser(
      'project',
      ContainerRole.Writer,
      'User|userId',
      { _id: 'User|userId90' }
    )
    expect(
      containerService.emailService.sendContainerInvitationAcceptance
    ).toHaveBeenCalled()
    expect(
      containerService.emailService.sendOwnerNotificationOfCollaborator
    ).toHaveBeenCalledTimes(2)
  })

  test('should not send email to the added user or any other owners', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.addContainerUser = async (_a: any, _b: any, _c: any) =>
      Promise.resolve(true)

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          writers: [],
          owners: ['User_userId90', 'User_userId99', 'User_userId77'],
          viewers: ['User|userId']
        })
    }

    containerService.userRepository = {
      getById: async () => {
        containerService.userRepository = {
          getById: async () => Promise.resolve(null)
        }
        return Promise.resolve({})
      }
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn()
    }

    await containerService.addContainerUser(
      'project',
      ContainerRole.Writer,
      'User|userId',
      { _id: 'User|userId90' }
    )
    return expect(
      containerService.emailService.sendContainerInvitationAcceptance
    ).not.toBeCalled()
  })
})

describe('containerService - manageUserRole', () => {
  test('should fail if the token is incorrect', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()

    return expect(
      containerService.manageUserRole(
        chance.string(),
        chance.string(),
        chance.string(),
        chance.string()
      )
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if user does not exist in the DB', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.userService = {
      profile: async () => Promise.resolve(null)
    }

    const chance = new Chance()

    return expect(
      containerService.manageUserRole(
        validJWTToken,
        chance.string(),
        chance.string(),
        chance.string()
      )
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if the project is not in the db', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser)
    }

    containerService.userService = {
      profile: async () => Promise.resolve(validUserProfile)
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerService.manageUserRole(
        validJWTToken,
        chance.string(),
        chance.string(),
        chance.string()
      )
    ).rejects.toThrowError(RecordNotFoundError)
  })

  test('should fail if the user is not an owner', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser)
    }

    containerService.userService = {
      profile: async () => Promise.resolve(validUserProfile)
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject)
    }

    return expect(
      containerService.manageUserRole(
        validJWTToken,
        validProject._id,
        chance.string(),
        chance.string()
      )
    ).rejects.toThrowError(UserRoleError)
  })

  test('should fail if the managedUser is not in the project', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser)
    }

    containerService.userService = {
      profile: async () => Promise.resolve(validUserProfile)
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject2)
    }

    return expect(
      containerService.manageUserRole(
        validJWTToken,
        validProject2._id,
        `User|${chance.string()}`,
        chance.string()
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('should fail if there is only one owner being managed', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser)
    }

    containerService.userService = {
      profile: async () => Promise.resolve(validUserProfile)
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject5)
    }

    return expect(
      containerService.manageUserRole(
        validJWTToken,
        validProject5._id,
        validUser1._id,
        chance.string()
      )
    ).rejects.toThrowError(UserRoleError)
  })

  test('should fail if trying to make project public and the role sent is not viewer', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser)
    }

    containerService.userService = {
      profile: async () => Promise.resolve(validUserProfile)
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4)
    }

    containerService.updateProjectUser = jest.fn()

    return expect(
      containerService.manageUserRole(
        validJWTToken,
        validProject5._id,
        '*',
        ContainerRole.Writer
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('should call update project user', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.userService = {
      profile: async () => Promise.resolve(validUserProfile)
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser)
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4)
    }

    containerService.updateContainer = jest.fn()

    await containerService.manageUserRole(
      validJWTToken,
      validProject4._id,
      validProject4.writers[0].replace('_', '|'),
      ContainerRole.Owner
    )

    expect(containerService.updateContainer).toBeCalled()
  })
})

describe('containerService - updateContainerUser', () => {
  test('should fail if the project is not in the db', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    const chance = new Chance()

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerService.updateContainerUser(
        chance.string(),
        ContainerRole.Writer,
        {
          _id: 'User|userId',
          email: 'foobar@baz.com'
        }
      )
    ).rejects.toThrowError(RecordNotFoundError)
  })

  test('should fail if wrong role assigned', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4)
    }

    return expect(
      containerService.updateContainerUser(
        validProject4._id,
        'wrestler',
        {
          _id: 'User|userId',
          email: 'foobar@baz.com'
        }
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('should update the user from viewer to owner', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn()
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com', 'User_test2']
    const newWriters = ['User_test', 'User_test10']
    const newViewers: string[] = []

    await containerService.updateContainerUser(
      validProject4._id,
      ContainerRole.Owner,
      {
        _id: 'User|test2',
        email: 'foobar@baz.com'
      }
    )

    return expect(containerService.containerRepository.patch).toBeCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers
      },
      {}
    )
  })

  test('should update the user from owner to viewer', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn()
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test', 'User_test10']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(
      validProject4._id,
      ContainerRole.Viewer,
      {
        _id: 'User|test2',
        email: 'foobar@baz.com'
      }
    )

    return expect(containerService.containerRepository.patch).toBeCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers
      },
      {}
    )
  })

  test('should update the user from writer to owner', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn()
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com', 'User_test']
    const newWriters = ['User_test10']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(
      validProject4._id,
      ContainerRole.Owner,
      {
        _id: 'User|test',
        email: 'foobar@baz.com'
      }
    )

    return expect(containerService.containerRepository.patch).toBeCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers
      },
      {}
    )
  })

  test('should update the user from owner to writer', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn()
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test10', 'User_test']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(
      validProject4._id,
      ContainerRole.Writer,
      {
        _id: 'User|test',
        email: 'foobar@baz.com'
      }
    )

    return expect(containerService.containerRepository.patch).toBeCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers
      },
      {}
    )
  })

  test('should update the user from writer to viewer', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn()
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test10']
    const newViewers = ['User_test2', 'User_test']

    await containerService.updateContainerUser(
      validProject4._id,
      ContainerRole.Viewer,
      {
        _id: 'User|test',
        email: 'foobar@baz.com'
      }
    )
    return expect(containerService.containerRepository.patch).toBeCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers
      },
      {}
    )
  })

  test('should update the user from viewer to writer', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn()
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test10', 'User_test']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(
      validProject4._id,
      ContainerRole.Writer,
      {
        _id: 'User|test',
        email: 'foobar@baz.com'
      }
    )

    return expect(containerService.containerRepository.patch).toBeCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers
      },
      {}
    )
  })

  test('should remove the user if the role in null', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn()
    }

    containerService.containerInvitationRepository = {
      getInvitationsForUser: async () => Promise.resolve([]),
      deleteInvitations: async () => Promise.resolve()
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test10']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(
      validProject4._id,
      null,
      {
        _id: 'User|test',
        email: 'foobar@baz.com'
      }
    )

    return expect(containerService.containerRepository.patch).toBeCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers
      },
      {}
    )
  })

  test('should delete the invitations if the role in null and the user was invited', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn()
    }

    containerService.containerInvitationRepository = {
      getInvitationsForUser: async () => Promise.resolve([{ _id: 'User_asd' }]),
      deleteInvitations: jest.fn()
    }

    await containerService.updateContainerUser(
      validProject4._id,
      null,
      {
        _id: 'User|test',
        email: 'foobar@baz.com'
      }
    )

    return expect(
      containerService.containerInvitationRepository.deleteInvitations
    ).toBeCalled()
  })
})

describe('containerService - getUserRole', () => {
  test('should return owner if the user is an owner', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    expect(
      containerService.getUserRole(
        validProject2,
        'User|valid-user-1@manuscriptsapp.com'
      )
    ).toBe(ContainerRole.Owner)
  })

  test('should return writer if the user is an writer', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    expect(containerService.getUserRole(validProject4, 'User|test10')).toBe(
      ContainerRole.Writer
    )
  })

  test('should return viewer if the user is an viewer', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    expect(containerService.getUserRole(validProject4, 'User|test2')).toBe(
      ContainerRole.Viewer
    )
  })

  test('should return null if the user is not in the project', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    expect(containerService.getUserRole(validProject4, 'User|asda')).toBeNull()
  })
})

describe('containerService - getArchive', () => {
  test('should fail if the project does not exist', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const userService: any = DIContainer.sharedContainer.userService

    userService.userProfileRepository = {
      getById: async () => Promise.resolve(validUserProfile)
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null),
      getContainerResources: async () => Promise.resolve([])
    }

    return expect(
      containerService.getArchive(validProject4._id)
    ).rejects.toThrow(RecordNotFoundError)
  })

  test('should return an object if project is public and attachments are not requested', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const userService: any = DIContainer.sharedContainer.userService

    userService.userProfileRepository = {
      getById: async () => Promise.resolve(validUserProfile)
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject7),
      getContainerResources: async () => Promise.resolve([validProject7]),
      getProjectAttachments: async () => Promise.resolve([])
    }

    const archive = await containerService.getArchive(validUserProfile.userID, validProject7._id, null, false, { getAttachments: true })
    const zip = await JSZip.loadAsync(archive)
    expect(Object.keys(zip.files).length).toBe(2)
    const content = await zip.files['index.manuscript-json'].async('text')
    const json = JSON.parse(content)
    expect(json.data[0]._id).toBe('valid-project-id-7')
  })

  test('should return an object with only IDs if project is public and attachments are not requested', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const userService: any = DIContainer.sharedContainer.userService

    userService.userProfileRepository = {
      getById: async () => Promise.resolve(validUserProfile)
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject7),
      getContainerResourcesIDs: async () =>
        Promise.resolve([validProject7._id]),
      getProjectAttachments: async () => Promise.resolve([])
    }

    const archive = await containerService.getArchive(validUserProfile.userID, validProject7._id, null, false, { onlyIDs: true, getAttachments: true })

    const zip = await JSZip.loadAsync(archive)
    expect(Object.keys(zip.files).length).toBe(2)
    const content = await zip.files['index.manuscript-json'].async('text')
    const json = JSON.parse(content)
    expect(json.data[0]).toBe('valid-project-id-7')
  })

  test('should fail to return a zip file if project is private and token not supplied', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      getContainerResources: async () => Promise.resolve([validProject4]),
      getProjectAttachments: async () => Promise.resolve([])
    }

    return expect(
      containerService.getArchive(validUserProfile.userID, validProject4._id, null, true)
    ).rejects.toThrow(InvalidCredentialsError)
  })

  test('should return a zip file if project is private and the user authenticated', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const userService: any = DIContainer.sharedContainer.userService

    userService.authenticateUser = async () => Promise.resolve()

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      getContainerResources: async () => Promise.resolve([validProject4]),
      getProjectAttachments: async () => Promise.resolve([])
    }

    const chance = new Chance()
    const archive = await containerService.getArchive(validUserProfile.userID, validProject4._id, null, chance.string(), { getAttachments: true })
    const zip = await JSZip.loadAsync(archive)
    expect(Object.keys(zip.files).length).toBe(2)
    const content = await zip.files['index.manuscript-json'].async('text')
    const json = JSON.parse(content)
    expect(json.data[0]._id).toBe('valid-project-id-4')
  })

  test('should return a zip file if project is private, the user authenticated and attachments requested', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const userService: any = DIContainer.sharedContainer.userService

    userService.authenticateUser = async () => Promise.resolve()

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      getContainerResources: async () => Promise.resolve([validProject4]),
      getProjectAttachments: async () => Promise.resolve([])
    }

    const chance = new Chance()

    return expect(
      containerService.getArchive(validUserProfile.userID, validProject4._id, null, chance.string(), { getAttachments: true })
    ).resolves.toBeInstanceOf(Buffer)
  })
})

describe('containerService - getAttachment', () => {
  test('should fail if the project cannot be found', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerService.getAttachment('MPFigure:12345')
    ).rejects.toThrow(RecordNotFoundError)
  })

  test('should return a contentType and body', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async (id: string) => {
        if (id === 'MPProject') {
          return Promise.resolve(validProject7)
        } else {
          return Promise.resolve({
            _id: 'MPFigure:12345',
            containerID: 'MPProject',
            _attachments: {
              image: {
                content_type: 'image/png'
              }
            }
          })
        }
      },
      getAttachmentBody: async () => Promise.resolve('body')
    }

    return expect(
      containerService.getAttachment('MPFigure:12345')
    ).resolves.toHaveProperty('body')
  })

  test('should fail to return the file if the project is not public and user not contributor in project', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async (id: string) => {
        if (id === 'MPProject') {
          return Promise.resolve(validProject4)
        } else {
          return Promise.resolve({
            _id: 'MPFigure:12345',
            containerID: 'MPProject',
            _attachments: {
              image: {
                content_type: 'image/png'
              }
            }
          })
        }
      },
      getAttachmentBody: async () => Promise.resolve('body')
    }

    return expect(containerService.getAttachment('MPFigure:12345')).rejects.toThrow(ValidationError)
  })

  test('should fail if the project cannot be found', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.containerRepository = {
      getById: async (id: string) => {
        if (id === 'MPProject') {
          return Promise.resolve(null)
        } else {
          return Promise.resolve({
            _id: 'MPFigure:12345',
            containerID: 'MPProject',
            _attachments: {
              image: {
                content_type: 'image/png'
              }
            }
          })
        }
      },
      getAttachmentBody: async () => Promise.resolve('body')
    }

    return expect(
      containerService.getAttachment('MPFigure:12345')
    ).rejects.toThrow(RecordNotFoundError)
  })

  test('should fail if the attachment is not found', () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    const containerRepo = DIContainer.sharedContainer.projectRepository
    containerRepo.getById = jest.fn(async (): Promise<any> => {
      return { containerID: 'MPProject:valid-project-id', ...validProject, _attachments: { } }
    })
    const documentID = chance.string()
    const attachmentKey = chance.string()
    return expect(containerService.getAttachment('User_test', documentID, attachmentKey)).rejects.toThrowError(RecordNotFoundError)
  })
})

describe('ContainerService - accessToken', () => {
  test('should return accessToken for specified scope', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.getContainer = () =>
      Promise.resolve({ owners: ['User_test'] })

    const accessToken = await containerService.accessToken(
      'User|test',
      'jupyterhub',
      'MPProject:foobarbaz'
    )
    const payload = jsonwebtoken.decode(
      accessToken.replace('Bearer ', '')
    ) as any

    expect(payload.iss).toBe('https://api-server.atypon.com')
  })

  test('should fail if the user is not a contributor in the container', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.getContainer = () => Promise.resolve({ owners: [] })

    return expect(
      containerService.accessToken(
        'User|test',
        'jupyterhub',
        'MPProject:foobarbaz'
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('should fail if the scope name is invalid', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]

    containerService.getContainer = () =>
      Promise.resolve({ owners: ['User_test'] })

    return expect(
      containerService.accessToken(
        'User|test',
        'something-random',
        'MPProject:foobarbaz'
      )
    ).rejects.toThrowError(InvalidScopeNameError)
  })
})

describe('ContainerService - addProductionNote', () => {
  test('should fail if target is not found', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getContainer = jest.fn(() => Promise.resolve(validProject))
    const userRebo: any = DIContainer.sharedContainer.userRepository
    userRebo.getOne = jest.fn(() => {
      return { _id: 'User_test', ...validBody2 }
    })
    const repo: any = DIContainer.sharedContainer.manuscriptNotesRepository
    repo.create = jest.fn(() => validNote1)
    repo.getById = jest.fn(() => {})
    const containerID = validNote1.containerID
    const manuscriptID = validNote1.manuscriptID
    const content = validNote1.contents
    const userID = 'User_test'
    const target = 'invalidTarget'
    const source = 'DASHBOARD'
    await expect(containerService.createManuscriptNote(containerID, manuscriptID, content, userID, source, target)).rejects.toThrow(RecordNotFoundError)
  })

  test('should fail if user not contributor', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getContainer = jest.fn(() => Promise.resolve(validProject))
    const userRebo: any = DIContainer.sharedContainer.userRepository
    userRebo.getOne = jest.fn(() => {
      return { _id: 'User_test2', ...validBody2 }
    })
    const repo: any = DIContainer.sharedContainer.manuscriptNotesRepository
    repo.create = jest.fn(() => validNote1)
    repo.getById = jest.fn(() => {})
    const containerID = validNote1.containerID
    const manuscriptID = validNote1.manuscriptID
    const content = validNote1.contents
    const userID = validUser1._id
    const source = 'DASHBOARD'
    await expect(containerService.createManuscriptNote(containerID, manuscriptID, content, userID, source)).rejects.toThrow(ValidationError)
  })

  test('should add note', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.checkIfOwnerOrWriter = jest.fn(() => true)
    const userRebo: any = DIContainer.sharedContainer.userRepository
    userRebo.getOne = jest.fn(() => {
      return { _id: 'User_test', ...validBody2 }
    })
    const repo: any = DIContainer.sharedContainer.manuscriptNotesRepository
    repo.create = jest.fn(() => validNote2)
    repo.getById = jest.fn(() => validNote1)
    const containerID = validNote2.containerID
    const manuscriptID = validNote2.manuscriptID
    const content = validNote2.contents
    const userID = validUser1._id
    const target = validNote1._id
    const source = 'DASHBOARD'
    const note = await containerService.createManuscriptNote(containerID, manuscriptID, content, userID, source, target)
    expect(note).toBeTruthy()
    expect(note._id).toBe('MPManuscriptNote:valid-note-id-2')
  })
})

describe('ContainerService - getProductionNotes', () => {
  test('should fail of user not contributor', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    const userRebo: any = DIContainer.sharedContainer.userRepository
    userRebo.getOne = jest.fn(() => {
      return { _id: 'User_test2', ...validBody2 }
    })
    containerService.getContainer = jest.fn(() => Promise.resolve(validProject))
    const repo: any = DIContainer.sharedContainer.manuscriptNotesRepository
    repo.getProductionNotes = jest.fn(() => [validNote1])
    const containerID = validProject._id
    const manuscriptID = validManuscript._id
    await expect(containerService.getProductionNotes(containerID, manuscriptID, validUser1._id)).rejects.toThrow(ValidationError)
  })

  test('should return a list of node', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.checkUserContainerAccess = jest.fn(() => true)
    const userRebo: any = DIContainer.sharedContainer.userRepository
    userRebo.getOne = jest.fn(() => {
      return { _id: 'User_test', ...validBody2 }
    })
    const repo: any = DIContainer.sharedContainer.manuscriptNotesRepository
    repo.getProductionNotes = jest.fn(() => [validNote1])
    const containerID = validProject._id
    const manuscriptID = validManuscript._id
    const notes = await containerService.getProductionNotes(containerID, manuscriptID)
    expect(notes).toBeTruthy()
    expect(notes.length).toBe(1)
  })
})
