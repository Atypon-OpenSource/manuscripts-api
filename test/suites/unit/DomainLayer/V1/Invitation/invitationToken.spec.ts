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
  RecordNotFoundError,
  UserRoleError
} from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { validProject } from '../../../../../data/fixtures/projects'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('Invitation - requestInvitationToken', () => {
  test('should fail if user does not exist', () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerInvitationService.requestInvitationToken('foo', 'bar', 'role')
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if role is not valid', () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com'
        })
    }
    return expect(
      containerInvitationService.requestInvitationToken('foo', 'bar', 'role')
    ).rejects.toThrowError(ValidationError)
  })

  test('should fail if project does not exist', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com'
        })
    }

    containerInvitationService.projectService.containerRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerInvitationService.requestInvitationToken('foo', 'MPProject:bar', 'Writer')
    ).rejects.toThrowError(RecordNotFoundError)
  })

  test('should fail if the user requesting invitation token is not a project owner', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com',
          _id: 'User|foo@bar.com'
        })
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      isOwner: () => false
    }

    return expect(
      containerInvitationService.requestInvitationToken('foo', 'MPProject:bar', 'Writer')
    ).rejects.toThrowError(UserRoleError)
  })

  test('should extend the invitation expiry if invitation token already exist', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com',
          _id: 'User|foo@bar.com'
        })
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve({ ...validProject, owners: ['User_foo@bar.com'] }),
      isOwner: () => true
    }

    containerInvitationService.invitationTokenRepository = {
      getById: async () => Promise.resolve({}),
      touch: jest.fn(() => Promise.resolve({ _id: 'InvitationToken|bar' }))
    }

    await containerInvitationService.requestInvitationToken('foo', 'MPProject:bar', 'Writer')
    expect(containerInvitationService.invitationTokenRepository.touch).toBeCalled()
  })

  test('should create new invitation token if token does not exist', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
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
      getContainer: async () => Promise.resolve({ ...validProject, owners: ['User_foo@bar.com'] }),
      isOwner: () => true
    }

    containerInvitationService.invitationTokenRepository = {
      getById: async () => Promise.resolve(null),
      create: jest.fn(() => Promise.resolve({ _id: 'InvitationToken|bar' }))
    }

    await containerInvitationService.requestInvitationToken('foo', 'MPProject:bar', 'Writer')
    expect(containerInvitationService.invitationTokenRepository.create).toBeCalled()
  })
})

describe('Invitation - refreshInvitationToken', () => {
  test('should fail if invitation token does not exist', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.resolveInvitationTokenDetails = async () =>
      Promise.resolve()
    containerInvitationService.invitationTokenRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerInvitationService.refreshInvitationToken('foo', 'bar', 'Writer')
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should refresh invitation token', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.resolveInvitationTokenDetails = async () =>
      Promise.resolve()
    containerInvitationService.invitationTokenRepository = {
      getById: async () => Promise.resolve({}),
      touch: jest.fn(() => Promise.resolve())
    }

    await containerInvitationService.refreshInvitationToken('foo', 'bar', 'Writer')
    expect(containerInvitationService.invitationTokenRepository.touch).toBeCalled()
  })
})
