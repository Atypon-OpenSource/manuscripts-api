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

import { ValidationError } from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('Invitation - Reject', () => {
  test('should reject invitation successfully', async () => {
    const invitationService: any =
      DIContainer.sharedContainer.invitationService
    invitationService.invitationRepository = {
      getById: async () => Promise.resolve({ invitedUserId: 'foo' }),
      remove: jest.fn(() => Promise.resolve())
    }

    await invitationService.reject('bar')
    expect(invitationService.invitationRepository.remove).toBeCalled()
  })

  test('should fail if invitation does not exist', () => {
    const invitationService: any =
      DIContainer.sharedContainer.invitationService
    invitationService.invitationRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      invitationService.reject('foo', [], null)
    ).rejects.toThrowError(ValidationError)
  })
})

describe('Invitation - rejectContainerInvite', () => {
  test('should reject invitation successfully', async () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve({ invitedUserId: 'foo' }),
      remove: jest.fn(() => Promise.resolve())
    }

    await containerInvitationService.rejectContainerInvite('bar')
    expect(containerInvitationService.containerInvitationRepository.remove).toBeCalled()
  })

  test('should fail if invitation does not exist', () => {
    const containerInvitationService: any =
      DIContainer.sharedContainer.containerInvitationService
    containerInvitationService.containerInvitationRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      containerInvitationService.rejectContainerInvite('foo', [], null)
    ).rejects.toThrowError(ValidationError)
  })
})
