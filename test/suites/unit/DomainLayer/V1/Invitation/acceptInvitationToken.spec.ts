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

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  InvalidCredentialsError,
  RecordGoneError,
  ValidationError,
} from '../../../../../../src/Errors'
import { ContainerRole } from '../../../../../../src/Models/ContainerModels'
import {
  invalidRoleInvitationToken,
  validInvitationToken,
  validInvitationToken2,
} from '../../../../../data/fixtures/invitationTokens'
import { validProject } from '../../../../../data/fixtures/projects'
import { validUser1 } from '../../../../../data/fixtures/UserRepository'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('Invitation - acceptInvitationToken', () => {
  test('should fail if invited user does not exist', () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(containerInvitationService.acceptInvitationToken('foo', 'bar')).rejects.toThrow(
      InvalidCredentialsError
    )
  })

  test('should fail if the role is invalid', () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve(validProject),
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
    }

    containerInvitationService.invitationTokenRepository = {
      getOne: async () => Promise.resolve(invalidRoleInvitationToken),
    }

    return expect(
      containerInvitationService.acceptInvitationToken(invalidRoleInvitationToken.token, 'bar')
    ).rejects.toThrow(ValidationError)
  })

  test('should fail if the invitation is not in the database', () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
    }

    containerInvitationService.invitationTokenRepository = {
      getOne: async () => Promise.resolve(null),
    }

    return expect(
      containerInvitationService.acceptInvitationToken(validInvitationToken.token, 'bar')
    ).rejects.toThrow(RecordGoneError)
  })

  test('should call addContainerUser successfully', async () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      getUserRole: () => null,
      addContainerUser: jest.fn(),
    }

    containerInvitationService.invitationTokenRepository = {
      getOne: async () => Promise.resolve(validInvitationToken),
    }

    containerInvitationService.containerInvitationRepository = {
      getInvitationsForUser: async () => [],
      getById: async () => Promise.resolve(validProject),
    }

    await containerInvitationService.acceptInvitationToken(validInvitationToken.token, 'User|bar')

    return expect(containerInvitationService.projectService.addContainerUser).toHaveBeenCalled()
  })

  test('should call updateContainerUser successfully', async () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      getUserRole: () => ContainerRole.Viewer,
      updateContainerUser: jest.fn(),
    }

    containerInvitationService.invitationTokenRepository = {
      getOne: async () => Promise.resolve(validInvitationToken2),
    }

    containerInvitationService.containerInvitationRepository = {
      getInvitationsForUser: async () => [],
      getById: async () => Promise.resolve(validProject),
    }

    await containerInvitationService.acceptInvitationToken(validInvitationToken2.token, 'User|bar')

    return expect(containerInvitationService.projectService.updateContainerUser).toHaveBeenCalled()
  })

  test('should not fail and return a message if the same role permitted', async () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      getUserRole: () => ContainerRole.Writer,
      updateContainerUser: jest.fn(),
    }

    containerInvitationService.invitationTokenRepository = {
      getOne: async () => Promise.resolve(validInvitationToken2),
    }

    containerInvitationService.containerInvitationRepository = {
      getInvitationsForUser: async () => [],
      getById: async () => Promise.resolve(validProject),
    }

    const response = await containerInvitationService.acceptInvitationToken(
      validInvitationToken2.token,
      'User|bar'
    )

    return expect(response.message).toBe('You already have this role.')
  })

  test('should not fail and return a message if a worse role permitted', async () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      getUserRole: () => ContainerRole.Owner,
      updateContainerUser: jest.fn(),
    }

    containerInvitationService.invitationTokenRepository = {
      getOne: async () => Promise.resolve(validInvitationToken2),
    }

    containerInvitationService.containerInvitationRepository = {
      getInvitationsForUser: async () => [],
      getById: async () => Promise.resolve(validProject),
    }

    const response = await containerInvitationService.acceptInvitationToken(
      validInvitationToken2.token,
      'User|bar'
    )

    return expect(response.message).toBe(
      'Your current role in the project is already of higher privilege.'
    )
  })

  test('should accept the sent invitation if the URI one has a worse role', async () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService

    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(validUser1),
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      getUserRole: () => ContainerRole.Owner,
      updateContainerUser: jest.fn(),
      addContainerUser: jest.fn(),
    }

    containerInvitationService.invitationTokenRepository = {
      getOne: async () => Promise.resolve(validInvitationToken2),
    }

    containerInvitationService.containerInvitationRepository = {
      getInvitationsForUser: async () =>
        Promise.resolve([{ role: 'Owner', containerID: 'MPProject:valid-project-id' }]),
      patch: async () => Promise.resolve(),
      getById: async () => Promise.resolve(validProject),
    }

    const response = await containerInvitationService.acceptInvitationToken(
      validInvitationToken2.token,
      'User|bar'
    )

    return expect(response.message).toBe(
      'Invitation with a less limiting role was found and accepted.'
    )
  })
})
