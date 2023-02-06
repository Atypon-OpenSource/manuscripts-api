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

import { Chance } from 'chance'

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  EmailServiceError,
  InvalidCredentialsError,
  InvalidPasswordError,
  MissingUserStatusError,
  ValidationError,
} from '../../../../../../src/Errors'
import { timestamp } from '../../../../../../src/Utilities/JWT/LoginTokenPayload'
import { validJWTToken, validUserStatus } from '../../../../../data/fixtures/authServiceUser'
import { validUser1 } from '../../../../../data/fixtures/UserRepository'
import { validUserToken } from '../../../../../data/fixtures/UserTokenRepository'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

const chance = new Chance()

describe('User - clearUsersData', () => {
  test('should delete users if date passed', async () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getUsersToDelete: async () =>
        Promise.resolve([{ ...validUser1, deleteAt: Math.floor(timestamp()) - 2 * 60 * 60 }]),
    }

    userService.deleteUser = jest.fn()
    userService.emailService = {
      sendAccountDeletionConfirmation: jest.fn(() => true),
    }

    await userService.clearUsersData()
    expect(userService.deleteUser).toHaveBeenCalled()
  })
})

describe('User - markUserForDeletion', () => {
  test('should fail if user does not exist in the DB', () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(userService.markUserForDeletion('userId')).rejects.toThrow(
      InvalidCredentialsError
    )
  })

  test('should fail if user password missing while connect disabled', () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    return expect(userService.markUserForDeletion('userId')).rejects.toThrow(ValidationError)
  })

  test('should fail if user status does not exist in the DB', () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    userService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }

    return expect(userService.markUserForDeletion('userId', chance.string())).rejects.toThrow(
      MissingUserStatusError
    )
  })

  test('should fail if password mismatched', () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    userService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }

    return expect(userService.markUserForDeletion('userId', chance.string())).rejects.toThrow(
      InvalidPasswordError
    )
  })

  test('should mark user document for deletion', async () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
      patch: jest.fn(),
    }

    userService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }

    userService.emailService = {
      sendAccountDeletionNotification: jest.fn(() => true),
    }

    await userService.markUserForDeletion('userId', '12345')
    expect(userService.userRepository.patch).toHaveBeenCalled()
  })

  test('should fail to send email', async () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
      patch: jest.fn(),
    }

    userService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }

    userService.emailService = {
      sendAccountDeletionNotification: jest.fn(() =>
        Promise.reject(new EmailServiceError('foo', null))
      ),
    }

    return expect(userService.markUserForDeletion('userId', '12345')).rejects.toThrow(
      EmailServiceError
    )
  })
})

describe('User - unmarkUserForDeletion', () => {
  test('should fail if user does not exist in the DB', () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(userService.unmarkUserForDeletion('userId')).rejects.toThrow(
      InvalidCredentialsError
    )
  })

  test('should unmark user for deletion', async () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
      patch: jest.fn(),
    }

    await userService.unmarkUserForDeletion('userId')
    expect(userService.userRepository.patch).toHaveBeenCalled()
  })
})

describe('User - deleteUser', () => {
  test('should fail if user does not exist in the DB', () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(userService.deleteUser('userId')).rejects.toThrow(InvalidCredentialsError)
  })

  test('should remove the user from all projects', async () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
      remove: jest.fn(),
    }

    userService.userProfileRepository = {
      purge: jest.fn(),
    }

    userService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      userStatusId: (id: string) => `UserStatus|${id}`,
      remove: jest.fn(),
    }

    userService.singleUseTokenRepository = {
      remove: jest.fn(),
    }

    userService.userTokenRepository = {
      remove: jest.fn(),
    }

    userService.invitationRepository = {
      removeByUserIdAndEmail: jest.fn(),
    }

    userService.containerInvitationRepository = {
      removeByUserIdAndEmail: jest.fn(),
    }

    userService.containerRequestRepository = {
      removeByUserIdAndEmail: jest.fn(),
    }

    userService.syncService = {
      removeUserStatus: jest.fn(),
    }

    userService.projectRepository = {
      patch: jest.fn(),
      getUserContainers: jest.fn(() =>
        Promise.resolve([
          {
            owners: [validUser1._id.replace('|', '_'), 'User_test'],
            writers: [],
            viewers: [],
          },
          {
            viewers: [validUser1._id.replace('|', '_')],
            writers: [],
            owners: ['User_owner'],
          },
          {
            writers: [validUser1._id.replace('|', '_')],
            owners: ['User_owner'],
            viewers: [],
          },
        ])
      ),
    }

    await userService.deleteUser('userId')
    expect(userService.projectRepository.patch).toHaveBeenCalledTimes(3)
  })

  test('should remove the project if the user being deleted is the only owner', async () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
      remove: jest.fn(),
    }

    userService.userProfileRepository = {
      purge: jest.fn(),
    }

    userService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      userStatusId: (id: string) => `UserStatus|${id}`,
      remove: jest.fn(),
    }

    userService.singleUseTokenRepository = {
      remove: jest.fn(),
    }

    userService.userTokenRepository = {
      remove: jest.fn(),
    }

    userService.invitationRepository = {
      removeByUserIdAndEmail: jest.fn(),
    }

    userService.containerInvitationRepository = {
      removeByUserIdAndEmail: jest.fn(),
    }

    userService.containerRequestRepository = {
      removeByUserIdAndEmail: jest.fn(),
    }

    userService.syncService = {
      removeUserStatus: jest.fn(),
    }

    userService.projectRepository = {
      removeWithAllResources: jest.fn(),
      getUserContainers: jest.fn(() =>
        Promise.resolve([
          {
            owners: [validUser1._id.replace('|', '_')],
            writers: [],
            viewers: [],
          },
        ])
      ),
    }

    await userService.deleteUser('userId')
    expect(userService.projectRepository.removeWithAllResources).toHaveBeenCalled()
  })

  test('should remove all the data related to user', async () => {
    const userService: any = DIContainer.sharedContainer.userService

    userService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
      remove: async () => Promise.resolve(true),
    }

    userService.userProfileRepository = {
      purge: jest.fn(),
    }

    userService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      userStatusId: (id: string) => `UserStatus|${id}`,
      remove: jest.fn(),
    }

    userService.singleUseTokenRepository = {
      remove: jest.fn(),
    }

    userService.userTokenRepository = {
      remove: jest.fn(),
    }

    userService.invitationRepository = {
      removeByUserIdAndEmail: jest.fn(),
    }

    userService.containerInvitationRepository = {
      removeByUserIdAndEmail: jest.fn(),
    }

    userService.containerRequestRepository = {
      removeByUserIdAndEmail: jest.fn(),
    }

    userService.syncService = {
      removeUserStatus: jest.fn(),
    }

    userService.projectRepository = {
      getUserContainers: jest.fn(async () => Promise.resolve([])),
    }

    const deleted = await userService.deleteUser('userId')
    expect(deleted).toBeTruthy()
    expect(userService.syncService.removeUserStatus).toHaveBeenCalled()
    expect(userService.singleUseTokenRepository.remove).toHaveBeenCalled()
    expect(userService.userTokenRepository.remove).toHaveBeenCalled()
    expect(userService.userStatusRepository.remove).toHaveBeenCalled()
  })
})

describe('User - getProfile', () => {
  test('should fail if the token is invalid', () => {
    const userService: any = DIContainer.sharedContainer.userService
    const chance = new Chance()

    return expect(userService.profile(chance.string())).rejects.toThrow(InvalidCredentialsError)
  })

  test('should get user profile', async () => {
    const userService: any = DIContainer.sharedContainer.userService

    userService.userProfileRepository = {
      getById: async () => Promise.resolve(validUser1),
    }
    const user = await userService.profile(validJWTToken)
    expect(user).toBe(validUser1)
  })
})

describe('User - authenticateUser', () => {
  test('should authenticate user', async () => {
    const userService: any = DIContainer.sharedContainer.userService
    userService.isScopedTokenPayload = jest.fn(() => false)
    userService.isLoginTokenPayload = jest.fn(() => true)
    const tokenRepo: any = DIContainer.sharedContainer.userTokenRepository
    tokenRepo.fullyQualifiedId = jest.fn(() => Promise.resolve(validUser1._id))
    tokenRepo.getById = jest.fn(() => Promise.resolve(validUserToken))
    const userRepo: any = DIContainer.sharedContainer.userRepository
    userRepo.getById = jest.fn(() => Promise.resolve(validUser1))
    userService.userProfileRepository = {
      getById: async () => Promise.resolve(validUser1),
    }
    await expect(userService.authenticateUser(validJWTToken)).resolves.not.toThrow()
  })
})
