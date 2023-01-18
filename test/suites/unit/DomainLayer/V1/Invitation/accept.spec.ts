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
  InvalidCredentialsError,
  MissingContainerError,
  RecordGoneError,
  ValidationError,
} from '../../../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('Invitation - Accept', () => {
  test('should fail if invitation does not exist', () => {
    const invitationService: any = DIContainer.sharedContainer.invitationService

    invitationService.invitationRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(invitationService.accept('foo', null, null)).rejects.toThrow(ValidationError)
  })

  test('should fail invited user does not exist and name and password are null', () => {
    const invitationService: any = DIContainer.sharedContainer.invitationService
    invitationService.invitationRepository = {
      getById: async () => Promise.resolve({ invitedUserEmail: 'example@example.com' }),
    }

    invitationService.userRepository = {
      getOne: async () => Promise.resolve(null),
    }

    return expect(invitationService.accept('foo', null, null)).rejects.toThrow(ValidationError)
  })

  test('should fail invited user does not exist and name is null', () => {
    const invitationService: any = DIContainer.sharedContainer.invitationService
    invitationService.invitationRepository = {
      getById: async () => Promise.resolve({ invitedUserEmail: 'example@example.com' }),
    }
    invitationService.userRepository = {
      getOne: async () => Promise.resolve(null),
    }

    return expect(invitationService.accept('foo', '123', null)).rejects.toThrow(ValidationError)
  })

  test('should fail invited user does not exist and password is null', () => {
    const invitationService: any = DIContainer.sharedContainer.invitationService
    invitationService.invitationRepository = {
      getById: async () => Promise.resolve({ invitedUserEmail: 'example@example.com' }),
    }
    invitationService.userRepository = {
      getOne: async () => Promise.resolve(null),
    }

    return expect(invitationService.accept('foo', null, 'bar')).rejects.toThrow(ValidationError)
  })

  test('should call signup function and create collaboration document', async () => {
    const invitationService: any = DIContainer.sharedContainer.invitationService

    invitationService.userRegistrationService.signup = jest.fn(() => Promise.resolve())

    invitationService.collaborationsRepository.create = jest.fn(() => Promise.resolve())

    invitationService.invitationRepository = {
      getById: async () =>
        Promise.resolve({
          userId: 'User|valid-user@manuscriptsapp.com',
          invitedUserEmail: 'valid-user@manuscriptsapp.com',
        }),
      remove: jest.fn(() => Promise.resolve()),
    }

    invitationService.userRepository = {
      getOne: async () => {
        invitationService.userRepository.getOne = () => Promise.resolve({ _id: 'User|bar' })
        return null
      },
    }

    await invitationService.accept('foo', 'baz', 'bar')
    expect(invitationService.userRegistrationService.signup).toHaveBeenCalled()
    expect(invitationService.invitationRepository.remove).toHaveBeenCalled()
    expect(invitationService.collaborationsRepository.create).toHaveBeenCalled()
  })

  test('should not call signup function and fail if user not create in the signup method', async () => {
    const invitationService: any = DIContainer.sharedContainer.invitationService
    invitationService.userRegistrationService.signup = jest.fn(() => Promise.resolve())
    invitationService.collaborationsRepository.create = jest.fn(() => Promise.resolve())
    invitationService.invitationRepository = {
      getById: async () => Promise.resolve({ invitedUserEmail: 'example@example.com' }),
      remove: jest.fn(() => Promise.resolve()),
    }

    invitationService.userRepository = {
      getOne: async () => {
        invitationService.userRepository.getOne = () => Promise.resolve(null)
        return { _id: 'User|bar' }
      },
    }

    return expect(invitationService.accept('foo', 'baz', 'bar')).rejects.toThrow(
      InvalidCredentialsError
    )
  })
})

describe('Invitation - acceptContainerInvite', () => {
  test('should fail if invitation does not exist', () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(
      containerInvitationService.acceptContainerInvite('foo', { _id: 'User|id' })
    ).rejects.toThrow(RecordGoneError)
  })

  test('should fail - Only the invited user could accept invitation.', () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve({ invitedUserEmail: 'example@example.com' }),
    }

    return expect(
      containerInvitationService.acceptContainerInvite('foo', {
        _id: 'User|id',
        email: 'id@example.com',
      })
    ).rejects.toThrow(InvalidCredentialsError)
  })

  test('should fail if the project does not exist', async () => {
    const invitationService: any = DIContainer.sharedContainer.containerInvitationService

    invitationService.projectService = {
      getContainer: async () => Promise.reject(),
    }

    invitationService.containerInvitationRepository = {
      getById: async () =>
        Promise.resolve({
          invitedUserEmail: 'example@example.com',
          role: 'Owner',
          invitingUserID: 'User_id',
        }),
      patch: jest.fn(() => Promise.resolve()),
      remove: jest.fn(),
    }

    return expect(
      invitationService.acceptContainerInvite('foo', {
        _id: 'User|id',
        email: 'example@example.com',
      })
    ).rejects.toThrow(MissingContainerError)
  })

  test('should accept the invitation and update the current user role', async () => {
    const invitationService: any = DIContainer.sharedContainer.containerInvitationService

    invitationService.containerInvitationRepository = {
      getById: async () =>
        Promise.resolve({
          invitedUserEmail: 'valid-user-1@manuscriptsapp.com',
          role: 'Owner',
          invitingUserID: 'User_id',
          containerID: 'MPProject:something',
        }),
      patch: jest.fn(() => Promise.resolve()),
      getInvitationsForUser: async () => [],
    }

    invitationService.projectService = {
      getContainer: jest.fn(() => Promise.resolve({})),
      updateContainerUser: jest.fn(),
      getUserRole: () => 'Viewer',
    }

    invitationService.userRepository = {
      getById: async () => Promise.resolve({ _id: 'User|id', email: 'id@manuscriptsapp.com' }),
    }

    await invitationService.acceptContainerInvite('foo', {
      _id: 'User|id',
      email: 'valid-user-1@manuscriptsapp.com',
    })
    expect(invitationService.projectService.updateContainerUser).toHaveBeenCalled()
  })

  test('should return a message if the same role permitted', async () => {
    const invitationService: any = DIContainer.sharedContainer.containerInvitationService

    invitationService.containerInvitationRepository = {
      getById: async () =>
        Promise.resolve({
          invitedUserEmail: 'valid-user-1@manuscriptsapp.com',
          role: 'Owner',
          invitingUserID: 'User_id',
          containerID: 'MPProject:something',
        }),
      remove: jest.fn(),
      getInvitationsForUser: async () => [],
    }

    invitationService.projectService = {
      getContainer: async () => Promise.resolve({}),
      updateContainerUser: jest.fn(),
      getUserRole: () => 'Owner',
    }

    invitationService.userRepository = {
      getById: async () => Promise.resolve({ _id: 'User|id', email: 'id@manuscriptsapp.com' }),
    }
    const response = await invitationService.acceptContainerInvite('foo', {
      _id: 'User|id',
      email: 'valid-user-1@manuscriptsapp.com',
    })
    return expect(response.message).toBe('You already have this role.')
  })

  test('should return a message if a more limiting role permitted', async () => {
    const invitationService: any = DIContainer.sharedContainer.containerInvitationService

    invitationService.containerInvitationRepository = {
      getById: async () =>
        Promise.resolve({
          invitedUserEmail: 'valid-user-1@manuscriptsapp.com',
          role: 'Viewer',
          invitingUserID: 'User_id',
          containerID: 'MPProject:something',
        }),
      remove: jest.fn(),
      getInvitationsForUser: async () => [],
    }

    invitationService.projectService = {
      getContainer: async () => Promise.resolve({}),
      updateContainerUser: jest.fn(),
      getUserRole: () => 'Owner',
    }

    invitationService.userRepository = {
      getById: async () => Promise.resolve({ _id: 'User|id', email: 'id@manuscriptsapp.com' }),
    }
    const response = await invitationService.acceptContainerInvite('foo', {
      _id: 'User|id',
      email: 'valid-user-1@manuscriptsapp.com',
    })
    return expect(response.message).toBe(
      'Your current role in the project is already of higher privilege.'
    )
  })

  test('should return a message if invitation already accepted', async () => {
    const invitationService: any = DIContainer.sharedContainer.containerInvitationService

    invitationService.containerInvitationRepository = {
      getById: async () =>
        Promise.resolve({
          invitedUserEmail: 'valid-user-1@manuscriptsapp.com',
          role: 'Viewer',
          invitingUserID: 'User_id',
          acceptedAt: new Chance().timestamp(),
          containerID: 'MPProject:something',
        }),
      remove: jest.fn(),
      getInvitationsForUser: async () => [],
    }

    invitationService.projectService = {
      getContainer: async () => Promise.resolve({}),
      updateContainerUser: jest.fn(),
      getUserRole: () => 'Owner',
    }

    invitationService.userRepository = {
      getById: async () => Promise.resolve({ _id: 'User|id', email: 'id@manuscriptsapp.com' }),
    }
    const response = await invitationService.acceptContainerInvite('foo', {
      _id: 'User|id',
      email: 'valid-user-1@manuscriptsapp.com',
    })
    return expect(response.message).toBe('Invitation already accepted.')
  })

  test('should find and accept the least limiting invitation', async () => {
    const invitationService: any = DIContainer.sharedContainer.containerInvitationService

    invitationService.containerInvitationRepository = {
      getById: async () =>
        Promise.resolve({
          invitedUserEmail: 'valid-user-1@manuscriptsapp.com',
          role: 'Writer',
          invitingUserID: 'User_id',
          containerID: 'MPProject:something',
        }),
      patch: jest.fn(() => Promise.resolve()),
      getInvitationsForUser: async () =>
        Promise.resolve([{ role: 'Owner', containerID: 'MPProject:something' }]),
    }

    invitationService.projectService = {
      getContainer: async () => Promise.resolve({}),
      addContainerUser: jest.fn(() => true),
      getUserRole: () => null,
    }

    invitationService.userRepository = {
      getById: async () => Promise.resolve({ _id: 'User|id', email: 'id@manuscriptsapp.com' }),
    }

    await invitationService.acceptContainerInvite('foo', {
      _id: 'User|id',
      email: 'valid-user-1@manuscriptsapp.com',
    })
    expect(invitationService.projectService.addContainerUser).toHaveBeenCalled()
  })

  test('should find and accept the least limiting invitation and delete others', async () => {
    const invitationService: any = DIContainer.sharedContainer.containerInvitationService

    invitationService.containerInvitationRepository = {
      getById: async () =>
        Promise.resolve({
          invitedUserEmail: 'valid-user-1@manuscriptsapp.com',
          role: 'Viewer',
          invitingUserID: 'User_id',
          containerID: 'MPProject:something',
        }),
      patch: jest.fn(() => Promise.resolve()),
      remove: jest.fn(),
      getInvitationsForUser: async () =>
        Promise.resolve([
          { role: 'Writer', containerID: 'MPProject:something' },
          {
            role: 'Viewer',
            _id: 'MPContainerInvitation:valid',
            containerID: 'MPProject:something',
          },
        ]),
    }

    invitationService.projectService = {
      getContainer: async () => Promise.resolve({}),
      addContainerUser: jest.fn(() => true),
      getUserRole: () => null,
    }

    invitationService.userRepository = {
      getById: async () => Promise.resolve({ _id: 'User|id', email: 'id@manuscriptsapp.com' }),
    }

    await invitationService.acceptContainerInvite('foo', {
      _id: 'User|id',
      email: 'valid-user-1@manuscriptsapp.com',
    })
    expect(invitationService.projectService.addContainerUser).toHaveBeenCalled()
  })
})
