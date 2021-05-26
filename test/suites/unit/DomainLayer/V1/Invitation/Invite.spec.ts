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

import {
  InvalidCredentialsError,
  ValidationError,
  ConflictingRecordError
} from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  validProject,
  validProject3
} from '../../../../../data/fixtures/projects'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('Invitation - invite', () => {
  test('should fail if inviting user does not exist', () => {
    const invitationService: any =
      DIContainer.sharedContainer.invitationService

    invitationService.userRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      invitationService.invite('foo', [], null)
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if invitedUserEmails is empty', () => {
    const invitationService: any =
      DIContainer.sharedContainer.invitationService

    invitationService.userRepository = {
      getById: async () => Promise.resolve({})
    }

    return expect(
      invitationService.invite('foo', [], null)
    ).rejects.toThrowError(ValidationError)
  })

  test('should fail if inviting user is inviting himself', () => {
    const invitationService: any =
      DIContainer.sharedContainer.invitationService

    invitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com'
        })
    }

    return expect(
      invitationService.invite('foo', ['foo@bar.com'], null)
    ).rejects.toThrowError(ValidationError)
  })

  test('should fail if user profile does not exist', async () => {
    const invitationService: any = DIContainer.sharedContainer.invitationService
    invitationService.userRepository = {
      getOne: async () => Promise.resolve(null),
      getById: async () => Promise.resolve({
        email: 'foo@bar.com',
        _id: 'User|foo@bar.com'
      })
    }

    invitationService.userProfileRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      invitationService.invite('foo', [ 'baz@bar.com' ], null)
    ).rejects.toThrowError(ValidationError)
  })

  test('should extend the invitation expiry if invitation already exist', async () => {
    const invitationService: any =
      DIContainer.sharedContainer.invitationService

    invitationService.userRepository = {
      getOne: async () => Promise.resolve(null),
      getById: async () =>
        Promise.resolve({
          _id: 'User_foo@bar.com',
          email: 'foo@bar.com'
        })
    }

    invitationService.invitationRepository = {
      getById: async () => Promise.resolve({}),
      touch: jest.fn(() => Promise.resolve({ _id: 'MPInvitation:bar' }))
    }

    invitationService.userProfileRepository = {
      getById: async () => Promise.resolve({ _id: 'UserProfile_foo@bar.com' })
    }

    invitationService.emailService.sendInvitation = jest.fn()
    await invitationService.invite('foo', ['baz@bar.com'], null)
    expect(invitationService.invitationRepository.touch).toBeCalled()
    expect(invitationService.emailService.sendInvitation).toBeCalled()
  })

  test('should create new invitation if invitation does not exist', async () => {
    const invitationService: any =
      DIContainer.sharedContainer.invitationService

    invitationService.userRepository = {
      getOne: async () => Promise.resolve(null),
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com',
          _id: 'User|foo@bar.com'
        })
    }

    invitationService.userProfileRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'UserProfile_foo@bar.com'
        })
    }

    invitationService.invitationRepository = {
      getById: async () => Promise.resolve(null),
      create: jest.fn(() => Promise.resolve({ _id: 'MPInvitation:bar' }))
    }

    invitationService.emailService.sendInvitation = jest.fn()

    await invitationService.invite('foo', ['baz@bar.com'], null)
    expect(invitationService.emailService.sendInvitation).toBeCalled()
  })
})

describe('Invitation - inviteToContainer', () => {
  test('should fail if inviting user does not exist', () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerInvitationService.inviteToContainer('foo', [], 'project-id', 'role', null)
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if invitedUserEmails is empty', () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve({})
    }

    return expect(
      containerInvitationService.inviteToContainer('foo', [], 'project-id', 'role', null)
    ).rejects.toThrowError(ValidationError)
  })

  test('should fail if inviting user is inviting himself', () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com'
        })
    }

    return expect(
      containerInvitationService.inviteToContainer(
        'foo',
        [{ email: 'foo@bar.com' }],
        'project-id',
        'role',
        null
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('should fail if role is not valid', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com'
        })
    }

    return expect(
      containerInvitationService.inviteToContainer(
        'foo',
        [{ email: 'baz@bar.com' }],
        'MPProject:project-id',
        'not-valid-role',
        null
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('inviting user can not invite others if he is not a project owner', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com',
          _id: 'foo@bar.com'
        })
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject)
    }

    return expect(
      containerInvitationService.inviteToContainer(
        'foo',
        [{ email: 'baz@bar.com' }],
        'MPProject:project-id',
        'Viewer',
        null
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('should fail if the invited user is already exist', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userProfileRepository = {
      getById: async () => Promise.resolve({})
    }

    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com',
          _id: 'User|foo@bar.com'
        }),
      getOne: async () => Promise.resolve({ _id: 'User|foo@bar.com' })
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject3),
      isContainerUser: () => true
    }

    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve({}),
      patch: jest.fn(() => Promise.resolve({ _id: 'ProjectInvitation|bar' }))
    }

    return expect(
      containerInvitationService.inviteToContainer(
        'foo',
        [{ email: 'baz@bar.com' }],
        'MPProject:project-id',
        'Viewer',
        null
      )
    ).rejects.toThrowError(ConflictingRecordError)
  })

  test('should fail if the user profile does not exist', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getOne: async () => Promise.resolve(null),
      getById: async () => Promise.resolve({
        email: 'foo@bar.com',
        _id: 'User|foo@bar.com'
      })
    }

    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve({}),
      patch: jest.fn(() => Promise.resolve({ _id: 'ProjectInvitation|bar' }))
    }

    containerInvitationService.projectService = {
      isContainerUser: () => false,
      getContainer: () => Promise.resolve(validProject3)
    }

    containerInvitationService.userProfileRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerInvitationService.inviteToContainer('User|foo', [{ email: 'baz@bar.com' }], 'project-id', 'Viewer', null)
    ).rejects.toThrowError(ValidationError)
  })

  test('should update the invitation if it is already exist', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getOne: async () => Promise.resolve(null),
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com',
          _id: 'User|foo@bar.com'
        })
    }

    containerInvitationService.userProfileRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'UserProfile_foo@bar.com'
        })
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject3),
      isContainerUser: () => false
    }

    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve({}),
      patch: jest.fn(() => Promise.resolve({ _id: 'ProjectInvitation|bar' }))
    }

    containerInvitationService.emailService.sendContainerInvitation = jest.fn()

    await containerInvitationService.inviteToContainer(
      'User|foo',
      [{ email: 'baz@bar.com' }],
      'MPProject:project-id',
      'Viewer',
      null
    )
    expect(containerInvitationService.containerInvitationRepository.patch).toBeCalled()
    expect(containerInvitationService.emailService.sendContainerInvitation).toBeCalled()
  })

  test('should create new project invitation if one does not exist', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getOne: async () => Promise.resolve(null),
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com',
          _id: 'User|foo@bar.com'
        })
    }

    containerInvitationService.userProfileRepository = {
      getById: async () =>
        Promise.resolve({
          _id: 'UserProfile_foo@bar.com'
        })
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject3),
      isContainerUser: () => false
    }

    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve(null),
      create: jest.fn(() => Promise.resolve({ _id: 'ProjectInvitation|bar' }))
    }

    containerInvitationService.emailService.sendContainerInvitation = jest.fn()

    await containerInvitationService.inviteToContainer(
      'User|foo',
      [{ email: 'baz@bar.com' }],
      'MPProject:project-id',
      'Viewer',
      null
    )

    expect(containerInvitationService.emailService.sendContainerInvitation).toBeCalled()
  })
})
