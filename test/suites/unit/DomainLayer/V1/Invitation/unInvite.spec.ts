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
  RoleDoesNotPermitOperationError,
  ValidationError,
} from '../../../../../../src/Errors'
import { validProject2 } from '../../../../../data/fixtures/projects'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('Invitation - uninvite', () => {
  test('should fail if project owner does not exist', () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.userRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(containerInvitationService.uninvite('foo', 'bar')).rejects.toThrow(
      InvalidCredentialsError
    )
  })

  test('should fail if invitation does not exist', async () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com',
          _id: 'User|foo@bar.com',
        }),
    }

    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(containerInvitationService.uninvite('foo', 'bar')).rejects.toThrow(
      ValidationError
    )
  })

  test('user cannot uninvite others in a project he is not an owner of', async () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com',
          _id: 'User|foo',
        }),
    }
    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve({ containerID: 'MPProject:valid-project-id-2' }),
    }

    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject2),
    }
    return expect(containerInvitationService.uninvite('foo', 'bar')).rejects.toThrow(
      RoleDoesNotPermitOperationError
    )
  })

  test('project owner can successfully uninvite other user', async () => {
    const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.userRepository = {
      getById: async () =>
        Promise.resolve({
          email: 'foo@bar.com',
          _id: 'User|test',
        }),
    }
    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve({ containerID: 'MPProject:valid-project-id-2' }),
      remove: jest.fn(() => Promise.resolve()),
    }
    containerInvitationService.projectService = {
      getContainer: async () => Promise.resolve(validProject2),
    }

    await containerInvitationService.uninvite('foo', 'bar')
    expect(containerInvitationService.containerInvitationRepository.remove).toHaveBeenCalled()
  })
})
