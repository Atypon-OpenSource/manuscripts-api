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

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ContainerService } from '../../../../../../src/DomainServices/Container/ContainerService'
import {
  ConflictingRecordError,
  InvalidCredentialsError,
  MissingContainerError,
  MissingProductionNoteError,
  MissingTemplateError,
  MissingUserStatusError,
  RecordNotFoundError,
  UserBlockedError,
  UserNotVerifiedError,
  UserRoleError,
  ValidationError,
} from '../../../../../../src/Errors'
import { ContainerRole } from '../../../../../../src/Models/ContainerModels'
import { validJWTToken, validUserStatus } from '../../../../../data/fixtures/authServiceUser'
import { validBody2 } from '../../../../../data/fixtures/credentialsRequestPayload'
import { validNote1, validNote2 } from '../../../../../data/fixtures/ManuscriptNote'
import { validManuscript } from '../../../../../data/fixtures/manuscripts'
import {
  validProject,
  validProject2,
  validProject4,
  validProject5,
  validProject7,
  validProject8,
} from '../../../../../data/fixtures/projects'
import { validUser1, validUserProfile } from '../../../../../data/fixtures/UserRepository'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { blockedStatus, notVerifiedStatus } from '../../../../../data/fixtures/userStatus'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
const JSZip = require('jszip')

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

const chance = new Chance()
describe('containerService - createContainer', () => {
  test('should fail if the token is incorrect', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    const chance = new Chance()

    return expect(containerService.createContainer(chance.string())).rejects.toThrow(
      InvalidCredentialsError
    )
  })

  test('should fail if user does not exist in the DB', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.userRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(containerService.createContainer(validJWTToken)).rejects.toThrow(
      InvalidCredentialsError
    )
  })

  test('should fail if user status does not exist in the DB', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }

    return expect(containerService.createContainer(validJWTToken)).rejects.toThrow(
      MissingUserStatusError
    )
  })

  test('should fail if user is blocked', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(blockedStatus),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }

    return expect(containerService.createContainer(validJWTToken)).rejects.toThrow(UserBlockedError)
  })

  test('should fail if user is not verified', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(notVerifiedStatus),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }

    return expect(containerService.createContainer(validJWTToken)).rejects.toThrow(
      UserNotVerifiedError
    )
  })

  test('should create a project', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      userStatusId: (id: string) => `UserStatus|${id}`,
    }

    containerService.containerRepository = {
      create: jest.fn(),
    }

    await containerService.createContainer(validJWTToken)
    expect(containerService.containerRepository.create).toHaveBeenCalled()
  })

  test('should create the project with a specified _id', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      userStatusId: (id: string) => `UserStatus|${id}`,
    }

    containerService.containerRepository = {
      create: jest.fn(),
    }

    await containerService.createContainer(validJWTToken, { _id: 'foo' })
    expect(containerService.containerRepository.create).toHaveBeenCalled()
  })
})

describe('containerService - deleteContainer', () => {
  test('should fail if container id is invalid', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(
      containerService.deleteContainer(chance.guid(), { _id: `User|${chance.guid()}` })
    ).rejects.toThrow(MissingContainerError)
  })

  test('should delete a project', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve({ owners: ['User_123abc123abc'] }),
      removeWithAllResources: jest.fn(),
    }

    await containerService.deleteContainer(chance.guid(), { _id: 'User|123abc123abc' })
    expect(containerService.containerRepository.removeWithAllResources).toHaveBeenCalled()
  })
})

describe('containerService - addContainerUser', () => {
  test('should fail if the project is not in the db', () => {
    const containerService: any = DIContainer.sharedContainer.containerService

    const chance = new Chance()

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(
      containerService.addContainerUser(chance.string(), ContainerRole.Writer, 'User|userId', {
        _id: 'User|userId2',
      })
    ).rejects.toThrow(MissingContainerError)
  })

  test('should fail if the added user is not in the database', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve({ _id: 'project', viewers: [] }),
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(
      containerService.addContainerUser(chance.string(), ContainerRole.Viewer, 'User|userId', {
        _id: 'User|userId2',
      })
    ).rejects.toThrow(ValidationError)
  })

  test('should fail if wrong role assigned', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({ _id: 'project', owners: [], writers: [], viewers: [] }),
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({}),
    }

    return expect(
      containerService.addContainerUser(chance.string(), 'striker', 'User|userId', {
        _id: 'User|userId2',
      })
    ).rejects.toThrow(ValidationError)
  })

  test('should update the project owners', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          owners: [],
          writers: [],
          viewers: [],
        }),
      patch: jest.fn(),
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({}),
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn(),
    }

    await containerService.addContainerUser('project', ContainerRole.Owner, 'User|userId', {
      _id: 'User|userId2',
    })
    return expect(containerService.containerRepository.patch).toHaveBeenCalled()
  })

  test('should update the project writers', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          writers: [],
          owners: [],
          viewers: [],
        }),
      patch: jest.fn(),
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({}),
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn(),
    }

    await containerService.addContainerUser('project', ContainerRole.Writer, 'User|userId', {
      _id: 'User|userId2',
    })
    return expect(containerService.containerRepository.patch).toHaveBeenCalled()
  })

  test('should update the project viewers', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          viewers: [],
          owners: [],
          writers: [],
        }),
      patch: jest.fn(),
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({}),
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn(),
    }

    await containerService.addContainerUser('project', ContainerRole.Viewer, 'User|userId', {
      _id: 'User|userId2',
    })
    return expect(containerService.containerRepository.patch).toHaveBeenCalled()
  })

  test('should fail with InvalidCredentailsError if the user is malformed', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    return expect(containerService.getValidUser('User|foo')).rejects.toThrow(ValidationError)
  })

  test('should fail with a TypeError if the value is null', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    return expect(containerService.getValidUser(null)).rejects.toThrow(TypeError)
  })

  test('should fail if user id is not started with User_', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve({ _id: 'project', viewers: [] }),
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({}),
    }

    return expect(
      containerService.addContainerUser('project', ContainerRole.Viewer, 'userId', {
        _id: 'User|userId2',
      })
    ).rejects.toThrow(ValidationError)
  })

  test('should return false if the user already exists in the project', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'project',
          viewers: [],
          owners: [],
          writers: ['User_userId'],
        }),
      patch: jest.fn(),
    }

    containerService.userRepository = {
      getById: async () => Promise.resolve({}),
    }

    containerService.emailService = {
      sendContainerInvitationAcceptance: jest.fn(),
      sendOwnerNotificationOfCollaborator: jest.fn(),
    }

    return expect(
      await containerService.addContainerUser('project', ContainerRole.Viewer, 'User|userId', {
        _id: 'User|userId2',
      })
    ).toBeFalsy()
  })
})

describe('containerService - manageUserRole', () => {
  test('should fail if the project is not in the db', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    const chance = new Chance()

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser),
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(
      containerService.manageUserRole(chance.string(), chance.string(), chance.string())
    ).rejects.toThrow(MissingContainerError)
  })

  test('should fail if the user record is missing in the db', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    const chance = new Chance()

    containerService.userRepository = {
      getById: async () => Promise.resolve(),
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject),
    }

    return expect(
      containerService.manageUserRole(
        validProject._id,
        { userId: `User|${chance.string()}` },
        chance.string()
      )
    ).rejects.toThrow(ValidationError)
  })

  test('should fail if the managedUser is not in the project', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    const chance = new Chance()

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser),
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject2),
    }

    return expect(
      containerService.manageUserRole(
        validProject2._id,
        { userId: `User|${chance.string()}` },
        chance.string()
      )
    ).rejects.toThrow(ValidationError)
  })

  test('should fail if there is only one owner being managed', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    const chance = new Chance()

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject5),
    }

    return expect(
      containerService.manageUserRole(
        validProject5._id,
        { userId: validUser1._id },
        chance.string()
      )
    ).rejects.toThrow(UserRoleError)
  })

  // FIXME: Needs to fix the * logic
  test.skip('should fail if trying to make project public and the role sent is not viewer', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser),
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
    }

    containerService.updateProjectUser = jest.fn()

    return expect(
      containerService.manageUserRole(
        validProject5._id,
        '*',
        ContainerRole.Writer
      )
    ).rejects.toThrow(ValidationError)
  })

  test('should call update project user', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.userRepository = {
      getById: async () => Promise.resolve({ _id: validProject4.writers[0].replace('_', '|') }),
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    containerService.updateContainerTitleAndCollaborators = jest.fn()

    await containerService.manageUserRole(
      validProject4._id,
      { userId: validProject4.writers[0].replace('_', '|') },
      ContainerRole.Owner
    )

    expect(containerService.updateContainerTitleAndCollaborators).toHaveBeenCalled()
  })

  test('should call update project user using connectUserID', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.userRepository = {
      getOne: async () => Promise.resolve({ _id: validProject4.writers[0].replace('_', '|') }),
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    containerService.updateContainerTitleAndCollaborators = jest.fn()

    await containerService.manageUserRole(
      validProject4._id,
      { connectUserID: 'some-connect-id' },
      ContainerRole.Owner
    )

    expect(containerService.updateContainerTitleAndCollaborators).toHaveBeenCalled()
  })

  test('should call update project user with secret', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.userRepository = {
      getById: async () => Promise.resolve(validUser),
      getOne: async () => Promise.resolve(validUser),
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    containerService.updateContainerTitleAndCollaborators = jest.fn()

    await containerService.manageUserRole(
      validProject4._id,
      { userId: validProject4.writers[0].replace('_', '|') },
      ContainerRole.Owner,
      '123456789'
    )

    expect(containerService.updateContainerTitleAndCollaborators).toHaveBeenCalled()
  })
})

describe('containerService - updateContainerUser', () => {
  test('should fail if the project is not in the db', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    const chance = new Chance()

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(
      containerService.updateContainerUser(chance.string(), ContainerRole.Writer, {
        _id: 'User|userId',
        email: 'foobar@baz.com',
      })
    ).rejects.toThrow(MissingContainerError)
  })

  test('should fail if wrong role assigned', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
    }

    return expect(
      containerService.updateContainerUser(validProject4._id, 'wrestler', {
        _id: 'User|userId',
        email: 'foobar@baz.com',
      })
    ).rejects.toThrow(ValidationError)
  })

  test('should update the user from viewer to owner', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com', 'User_test2']
    const newWriters = ['User_test', 'User_test10']
    const newViewers: string[] = []

    await containerService.updateContainerUser(validProject4._id, ContainerRole.Owner, {
      _id: 'User|test2',
      email: 'foobar@baz.com',
    })

    return expect(containerService.containerRepository.patch).toHaveBeenCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers,
      }
    )
  })

  test('should update the user from owner to viewer', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test', 'User_test10']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(validProject4._id, ContainerRole.Viewer, {
      _id: 'User|test2',
      email: 'foobar@baz.com',
    })

    return expect(containerService.containerRepository.patch).toHaveBeenCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers,
      }
    )
  })

  test('should update the user from writer to owner', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com', 'User_test']
    const newWriters = ['User_test10']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(validProject4._id, ContainerRole.Owner, {
      _id: 'User|test',
      email: 'foobar@baz.com',
    })

    return expect(containerService.containerRepository.patch).toHaveBeenCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers,
      }
    )
  })

  test('should update the user from owner to writer', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test10', 'User_test']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(validProject4._id, ContainerRole.Writer, {
      _id: 'User|test',
      email: 'foobar@baz.com',
    })

    return expect(containerService.containerRepository.patch).toHaveBeenCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers,
      }
    )
  })

  test('should update the user from writer to viewer', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test10']
    const newViewers = ['User_test2', 'User_test']

    await containerService.updateContainerUser(validProject4._id, ContainerRole.Viewer, {
      _id: 'User|test',
      email: 'foobar@baz.com',
    })
    return expect(containerService.containerRepository.patch).toHaveBeenCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers,
      }
    )
  })

  test('should update the user from viewer to writer', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test10', 'User_test']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(validProject4._id, ContainerRole.Writer, {
      _id: 'User|test',
      email: 'foobar@baz.com',
    })

    return expect(containerService.containerRepository.patch).toHaveBeenCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers,
      }
    )
  })

  test('should update the user from viewer to annotator', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test10']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(validProject4._id, ContainerRole.Annotator, {
      _id: 'User|test',
      email: 'foobar@baz.com',
    })

    return expect(containerService.containerRepository.patch).toHaveBeenCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers,
        annotators: ['User_test'],
      }
    )
  })

  test('should update the user from annotator to editor', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject8),
      patch: jest.fn(),
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']

    await containerService.updateContainerUser(validProject8._id, ContainerRole.Editor, {
      _id: 'User|test2',
      email: 'foobar@baz.com',
    })

    return expect(containerService.containerRepository.patch).toHaveBeenCalledWith(
      validProject8._id,
      {
        _id: validProject8._id,
        owners: newOwners,
        editors: ['User_foo@bar.com', 'User_test2'],
        writers: [],
        viewers: [],
        annotators: [],
        title: undefined,
      }
    )
  })

  test('should update the user from editor to annotator', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject8),
      patch: jest.fn(),
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']

    await containerService.updateContainerUser(validProject8._id, ContainerRole.Annotator, {
      _id: 'User|foo@bar.com',
      email: 'foobar@baz.com',
    })

    return expect(containerService.containerRepository.patch).toHaveBeenCalledWith(
      validProject8._id,
      {
        _id: validProject8._id,
        owners: newOwners,
        editors: [],
        writers: [],
        viewers: [],
        annotators: ['User_test2', 'User_foo@bar.com'],
        title: undefined,
      }
    )
  })

  test('should remove the user if the role in null', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      patch: jest.fn(),
    }

    containerService.containerInvitationRepository = {
      getInvitationsForUser: async () => Promise.resolve([]),
      deleteInvitations: async () => Promise.resolve(),
    }

    const newOwners = ['User_valid-user-1@manuscriptsapp.com']
    const newWriters = ['User_test10']
    const newViewers = ['User_test2']

    await containerService.updateContainerUser(validProject4._id, null, {
      _id: 'User|test',
      email: 'foobar@baz.com',
    })

    return expect(containerService.containerRepository.patch).toHaveBeenCalledWith(
      validProject4._id,
      {
        _id: validProject4._id,
        owners: newOwners,
        writers: newWriters,
        viewers: newViewers,
      }
    )
  })

})

describe('containerService - getUserRole', () => {
  test('should return owner if the user is an owner', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    expect(
      containerService.getUserRole(validProject2, 'User|valid-user-1@manuscriptsapp.com')
    ).toBe(ContainerRole.Owner)
  })

  test('should return writer if the user is an writer', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    expect(containerService.getUserRole(validProject4, 'User|test10')).toBe(ContainerRole.Writer)
  })

  test('should return viewer if the user is an viewer', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    expect(containerService.getUserRole(validProject4, 'User|test2')).toBe(ContainerRole.Viewer)
  })

  test('should return editor if the user is an editor', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    expect(containerService.getUserRole(validProject8, 'User|foo@bar.com')).toBe(
      ContainerRole.Editor
    )
  })

  test('should return annotator if the user is an annotator', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    expect(containerService.getUserRole(validProject8, 'User|test2')).toBe(ContainerRole.Annotator)
  })

  test('should return true if user is editor', () => {
    expect(ContainerService.isEditor(validProject8 as any, 'User_foo@bar.com')).toBeTruthy()
  })

  test('should return true if user is annotator', () => {
    expect(ContainerService.isAnnotator(validProject8 as any, 'User_test2')).toBeTruthy()
  })

  test('should return null if the user is not in the project', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    expect(containerService.getUserRole(validProject4, 'User|asda')).toBeNull()
  })
})

describe('containerService - getArchive', () => {
  test('should fail if the project does not exist', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    const userService: any = DIContainer.sharedContainer.userService

    userService.userProfileRepository = {
      getById: async () => Promise.resolve(validUserProfile),
    }

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null),
      getContainerResources: async () => Promise.resolve([]),
    }

    return expect(containerService.getArchive(validProject4._id)).rejects.toThrow(
      MissingContainerError
    )
  })

  test('should fail to return a zip file if project is private and token not supplied', () => {
    const containerService: any = DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      getContainerResources: async () => Promise.resolve([validProject4]),
      getContainerAttachments: async () => Promise.resolve([]),
    }

    return expect(containerService.getArchive(validProject4._id, null, true)).rejects.toThrow(
      InvalidCredentialsError
    )
  })

  test('should return a zip file if project is private and the user authenticated', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    const userService: any = DIContainer.sharedContainer.userService

    userService.authenticateUser = async () => Promise.resolve()

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      getContainerResources: async () => Promise.resolve([validProject4]),
      getContainerAttachments: async () => Promise.resolve([]),
    }

    const chance = new Chance()
    const archive = await containerService.getArchive(validProject4._id, null, chance.string(), {
      getAttachments: true
    })
    const zip = await JSZip.loadAsync(archive)
    expect(Object.keys(zip.files).length).toBe(1)
    const content = await zip.files['index.manuscript-json'].async('text')
    const json = JSON.parse(content)
    expect(json.data[0]._id).toBe('valid-project-id-4')
  })

  test('should return a zip file if project is private, the user authenticated and attachments requested', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    const userService: any = DIContainer.sharedContainer.userService

    userService.authenticateUser = async () => Promise.resolve()

    containerService.containerRepository = {
      getById: async () => Promise.resolve(validProject4),
      getContainerResources: async () => Promise.resolve([validProject4]),
      getContainerAttachments: async () => Promise.resolve([]),
    }

    const chance = new Chance()

    return expect(
      containerService.getArchive(validProject4._id, null, chance.string(), {
        getAttachments: true,
      })
    ).resolves.toBeInstanceOf(Buffer)
  })
})

describe('containerService - getAttachment', () => {
  test('should fail if the project cannot be found', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

    containerService.containerRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(containerService.getAttachment('MPFigure:12345')).rejects.toThrow(
      MissingContainerError
    )
  })

  test('should return a contentType and body', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

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
                content_type: 'image/png',
              },
            },
          })
        }
      },
      getAttachmentBody: async () => Promise.resolve('body'),
    }

    return expect(containerService.getAttachment('MPFigure:12345')).resolves.toHaveProperty('body')
  })

  test('should throw MissingContainerError if the project cannot be found', () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService

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
                content_type: 'image/png',
              },
            },
          })
        }
      },
      getAttachmentBody: async () => Promise.resolve('body'),
    }

    return expect(containerService.getAttachment('MPFigure:12345')).rejects.toThrow(
      MissingContainerError
    )
  })

  test('should fail if the attachment is not found', () => {
    const containerService = DIContainer.sharedContainer.containerService
    const containerRepo = DIContainer.sharedContainer.projectRepository
    containerRepo.getById = jest.fn(async (): Promise<any> => {
      return { containerID: 'MPProject:valid-project-id', ...validProject, _attachments: {} }
    })
    const documentID = chance.string()
    const attachmentKey = chance.string()
    return expect(
      containerService.getAttachment(documentID, attachmentKey)
    ).rejects.toThrow(RecordNotFoundError)
  })
})


describe('ContainerService - createManuscript', () => {
  test('should fail if user not contributor', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    containerService.getContainer = jest.fn(() => Promise.resolve(validProject))
    const containerID = validNote1.containerID
    const manuscriptID = validNote1.manuscriptID
    const userID = 'User_test3'

    await expect(
      containerService.createManuscript(userID, containerID, manuscriptID)
    ).rejects.toThrow(ValidationError)
  })

  test('should fail if manuscript already exists', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    containerService.getContainer = jest.fn(() => Promise.resolve(validProject))
    containerService.manuscriptRepository.getById = jest.fn(() => Promise.resolve({}))
    const containerID = validNote1.containerID
    const manuscriptID = validNote1.manuscriptID
    const userID = 'User_test'

    await expect(
      containerService.createManuscript(userID, containerID, manuscriptID)
    ).rejects.toThrow(ConflictingRecordError)
  })

  test('should fail if template not found', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    containerService.getContainer = jest.fn(() => Promise.resolve(validProject))
    containerService.manuscriptRepository.getById = jest.fn(() => Promise.resolve(null))
    containerService.manuscriptRepository.create = jest.fn()
    containerService.templateRepository.getById = jest.fn(() => Promise.resolve(null))
    DIContainer.sharedContainer.configService.hasDocument = jest.fn(() =>
      Promise.resolve(false)
    )
    const containerID = validNote1.containerID
    const manuscriptID = validNote1.manuscriptID
    const userID = 'User_test'

    await expect(
      containerService.createManuscript(userID, containerID, manuscriptID, chance.string())
    ).rejects.toThrow(MissingTemplateError)
  })

  test('should not fail if template found in config data', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    containerService.getContainer = jest.fn(() => Promise.resolve(validProject))
    containerService.manuscriptRepository.getById = jest.fn(() => Promise.resolve(null))
    containerService.manuscriptRepository.create = jest.fn(() => Promise.resolve({}))
    containerService.templateRepository.getById = jest.fn(() => Promise.resolve(null))
    DIContainer.sharedContainer.configService.hasDocument = jest.fn(() =>
      Promise.resolve(true)
    )
    const containerID = validNote1.containerID
    const manuscriptID = validNote1.manuscriptID
    const userID = 'User_test'

    await containerService.createManuscript(userID, containerID, manuscriptID, 'templateId')
    expect(containerService.manuscriptRepository.create).toHaveBeenCalled()
  })

  test('should create a manuscript', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    containerService.getContainer = jest.fn(() => Promise.resolve(validProject))
    containerService.templateRepository.getById = jest.fn(() => Promise.resolve(null))
    DIContainer.sharedContainer.configService.hasDocument = jest.fn(() =>
      Promise.resolve(true)
    )
    containerService.manuscriptRepository = {
      getById: jest.fn(() => Promise.resolve(null)),
      create: jest.fn(() => Promise.resolve({})),
    }
    const containerID = validNote1.containerID
    const manuscriptID = validNote1.manuscriptID
    const userID = 'User_test'

    await containerService.createManuscript(userID, containerID, manuscriptID, 'templateId')
    expect(containerService.manuscriptRepository.create).toHaveBeenCalled()
  })
})

describe('ContainerService - addProductionNote', () => {
  test('should fail if target is not found', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
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
    const target = 'invalidTarget'
    const source = 'DASHBOARD'
    await expect(
      containerService.createManuscriptNote(
        containerID,
        manuscriptID,
        content,
        validUser1._id,
        source,
        target
      )
    ).rejects.toThrow(MissingProductionNoteError)
  })

  test('should add note', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    containerService.checkIfUserCanCreateNote = jest.fn(() => true)
    const userRebo: any = DIContainer.sharedContainer.userRepository
    userRebo.getOne = jest.fn(() => {
      return { _id: 'User_test', ...validBody2 }
    })
    const repo: any = DIContainer.sharedContainer.manuscriptNotesRepository
    repo.create = jest.fn(() => Promise.resolve(validNote2))
    repo.getById = jest.fn(() => Promise.resolve(validNote1))
    const containerID = validNote2.containerID
    const manuscriptID = validNote2.manuscriptID
    const content = validNote2.contents
    const target = validNote1._id
    const source = 'DASHBOARD'
    const note = await containerService.createManuscriptNote(
      containerID,
      manuscriptID,
      content,
      validUser1._id,
      source,
      target
    )
    expect(note).toBeTruthy()
    expect(note.id).toBe('MPManuscriptNote:valid-note-id-2')
  })
})

describe('ContainerService - getProductionNotes', () => {
  test('should return a list of node', async () => {
    const containerService: any =
      DIContainer.sharedContainer.containerService
    const repo: any = DIContainer.sharedContainer.manuscriptNotesRepository
    repo.getProductionNotes = jest.fn(() => [validNote1])
    const containerID = validProject._id
    const manuscriptID = validManuscript._id
    const notes = await containerService.getProductionNotes(containerID, manuscriptID)
    expect(notes).toBeTruthy()
    expect(notes.length).toBe(1)
  })
})
