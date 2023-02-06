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

import { InvitationController } from '../../../../../../src/Controller/V1/Invitation/InvitationController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { AuthService } from '../../../../../../src/DomainServices/Auth/AuthService'
import { ValidationError } from '../../../../../../src/Errors'
import { ContainerRole, ContainerType } from '../../../../../../src/Models/ContainerModels'
import { validInvitationToken } from '../../../../../data/fixtures/invitationTokens'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('InvitationController', () => {
  describe('invite', () => {
    test('should call invite method on the invitation service', async () => {
      const invitationService: any = DIContainer.sharedContainer.invitationService
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitedUsersEmails: [],
        },
      }
      invitationService.invite = jest.fn(() => Promise.resolve())

      const invitationController: any = new InvitationController()
      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      await invitationController.invite(req)

      expect(invitationService.invite).toHaveBeenCalled()
    })

    test('should fail if user does not exist', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitedUsersEmails: [],
        },
      }
      const invitationController: any = new InvitationController()

      return expect(invitationController.invite(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if invitedUsersEmails is not a valid array', async () => {
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitedUsersEmails: {},
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()

      return expect(invitationController.invite(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if message is set but not a string', async () => {
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitedUsersEmails: [],
          message: 123,
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()

      return expect(invitationController.invite(req)).rejects.toThrow(ValidationError)
    })
  })

  describe('inviteToContainer', () => {
    test('should call projectInvite method on the invitation service', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitedUsers: [],
          role: ContainerRole.Owner,
          message: 'message',
        },
        params: {
          containerID: 'MPProject:bar',
        },
      }

      containerInvitationService.inviteToContainer = jest.fn(() => Promise.resolve())

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)
      await invitationController.inviteToContainer(req)

      expect(containerInvitationService.inviteToContainer).toHaveBeenCalled()
    })

    test('should fail if user does not exist', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitedUsers: [],
          role: ContainerRole.Owner,
        },
        params: {
          containerID: 'MPProject:bar',
        },
      }
      const invitationController: any = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if invitedUsers is not a valid array', async () => {
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitedUsers: {},
          role: ContainerRole.Owner,
        },
        params: {
          containerID: 'MPProject:Bar',
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if message is set but not a string', async () => {
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitedUsers: [],
          role: ContainerRole.Owner,
          message: 123,
        },
        params: {
          containerID: 'MPProject:Bar',
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if containerID is set but not a string', async () => {
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitedUsers: [],
          role: ContainerRole.Owner,
        },
        params: {
          containerID: 123,
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if role is set but not a string', async () => {
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitedUsers: [],
          role: 123,
        },
        params: {
          containerID: 'MPProject:Bar',
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrow(ValidationError)
    })
  })

  describe('reject', () => {
    test('should call reject method on the invitation service', async () => {
      const invitationService: any = DIContainer.sharedContainer.invitationService
      const req: any = {
        body: {
          invitationId: 'MPInvitation:bar',
        },
      }
      invitationService.reject = jest.fn(() => Promise.resolve())

      const invitationController = new InvitationController()
      await invitationController.reject(req)

      expect(invitationService.reject).toHaveBeenCalled()
    })

    test('should call rejectContainerInvite method on the invitation service', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService

      const req: any = {
        body: {
          invitationId: 'MPContainerInvitation:bar',
        },
      }

      containerInvitationService.rejectContainerInvite = jest.fn(() => Promise.resolve())

      const invitationController = new InvitationController()
      await invitationController.reject(req)

      expect(containerInvitationService.rejectContainerInvite).toHaveBeenCalled()
    })

    test('should fail if invitationId is not a string', async () => {
      const invitationService: any = DIContainer.sharedContainer.invitationService
      const req: any = {
        body: {
          invitationId: 123,
        },
      }
      invitationService.reject = jest.fn(() => Promise.resolve())
      const invitationController = new InvitationController()

      return expect(invitationController.reject(req)).rejects.toThrow(ValidationError)
    })
  })

  describe('accept', () => {
    test('should call accept method on the invitation service', async () => {
      const invitationService: any = DIContainer.sharedContainer.invitationService
      const req: any = {
        body: {
          invitationId: 'MPInvitation:bar',
          password: 'abc123',
          name: 'bar',
        },
      }
      invitationService.accept = jest.fn(() => Promise.resolve())

      const invitationController = new InvitationController()
      await invitationController.accept(req)

      expect(invitationService.accept).toHaveBeenCalled()
    })

    test('should call acceptContainerInvite method on the invitation service', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitationId: 'MPContainerInvitation:bar',
          password: 'abc123',
          name: 'bar',
        },
      }

      containerInvitationService.acceptContainerInvite = jest.fn(() => Promise.resolve())

      const invitationController = new InvitationController()
      await invitationController.accept(req)

      expect(containerInvitationService.acceptContainerInvite).toHaveBeenCalled()
    })

    test('should fail if invitationId is not a string', async () => {
      const invitationService: any = DIContainer.sharedContainer.invitationService
      const req: any = {
        body: {
          invitationId: 123,
        },
      }
      invitationService.reject = jest.fn(() => Promise.resolve())
      const invitationController = new InvitationController()

      return expect(invitationController.accept(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if password is sent but not a string', async () => {
      const invitationService: any = DIContainer.sharedContainer.invitationService
      const req: any = {
        body: {
          invitationId: 'Invitation|bar',
          password: 123,
        },
      }
      invitationService.reject = jest.fn(() => Promise.resolve())
      const invitationController = new InvitationController()

      return expect(invitationController.accept(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if name is sent but not a string', async () => {
      const invitationService: any = DIContainer.sharedContainer.invitationService
      const req: any = {
        body: {
          invitationId: 'Invitation|bar',
          password: 'abc123',
          name: 123,
        },
      }
      invitationService.reject = jest.fn(() => Promise.resolve())
      const invitationController = new InvitationController()

      return expect(invitationController.accept(req)).rejects.toThrow(ValidationError)
    })
  })

  describe('uninvite', () => {
    test('should call uninvite method on the invitation service', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitationId: 'MPContainerInvitation:bar',
        },
      }
      containerInvitationService.uninvite = jest.fn(() => Promise.resolve())

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)
      await invitationController.uninvite(req)

      expect(containerInvitationService.uninvite).toHaveBeenCalled()
    })

    test('should fail if user does not exist', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitationId: 'bar',
        },
      }
      const invitationController: any = new InvitationController()

      return expect(invitationController.uninvite(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if invitationId is not a string', async () => {
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        body: {
          invitationId: 123,
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()

      return expect(invitationController.uninvite(req)).rejects.toThrow(ValidationError)
    })
  })

  describe('requestInvitationToken', () => {
    test('should call requestInvitationToken method on the invitation service', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        params: {
          containerID: 'MPProject:Bar',
          role: 'Writer',
        },
      }

      containerInvitationService.requestInvitationToken = jest.fn(() => Promise.resolve())

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)
      await invitationController.requestInvitationToken(req)

      expect(containerInvitationService.requestInvitationToken).toHaveBeenCalled()
    })

    test('should call requestInvitationToken method on the invitation service', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        params: {
          containerID: 'MPProject:Bar',
          role: 'Writer',
        },
      }

      containerInvitationService.requestInvitationToken = jest.fn(() => Promise.resolve())

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)
      await invitationController.requestInvitationToken(req)

      expect(containerInvitationService.requestInvitationToken).toHaveBeenCalled()
    })

    test('should fail if user does not exist', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer 12345',
        },
        params: {
          containerID: 'MPProject:Bar',
          role: 'Writer',
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)

      return expect(invitationController.requestInvitationToken(req)).rejects.toThrow(
        ValidationError
      )
    })

    test('should fail if role is not valid', async () => {
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        params: {
          containerID: 'MPProject:Bar',
          role: 'not-valid',
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)

      return expect(invitationController.requestInvitationToken(req)).rejects.toThrow(
        ValidationError
      )
    })

    test('should fail if containerID is not a string', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        params: {
          containerID: 123,
          role: 'Writer',
        },
      }

      containerInvitationService.refreshInvitationToken = jest.fn(() => Promise.resolve())

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)

      return expect(invitationController.requestInvitationToken(req)).rejects.toThrow(
        ValidationError
      )
    })
  })

  describe('refreshInvitationToken', () => {
    test('should call refreshInvitationToken method', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        params: {
          containerID: 'MPProject:Bar',
          role: 'Writer',
        },
      }

      containerInvitationService.refreshInvitationToken = jest.fn(() => Promise.resolve())

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)
      await invitationController.refreshInvitationToken(req)

      expect(containerInvitationService.refreshInvitationToken).toHaveBeenCalled()
    })

    test('should call refreshInvitationToken method on the invitation service', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        params: {
          containerID: 'MPProject:Bar',
          role: 'Writer',
        },
      }

      containerInvitationService.refreshInvitationToken = jest.fn(() => Promise.resolve())

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)
      await invitationController.refreshInvitationToken(req)

      expect(containerInvitationService.refreshInvitationToken).toHaveBeenCalled()
    })

    test('should fail if user does not exist', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer 12345',
        },
        params: {
          containerID: 'MPProject:Bar',
          role: 'Writer',
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)

      return expect(invitationController.refreshInvitationToken(req)).rejects.toThrow(
        ValidationError
      )
    })

    test('should fail if role is not valid', async () => {
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        params: {
          containerID: 'MPProject:Bar',
          role: 'not-valid',
        },
      }

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)

      return expect(invitationController.refreshInvitationToken(req)).rejects.toThrow(
        ValidationError
      )
    })

    test('should fail if containerID is not a string', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService
      const req: any = {
        user: {
          _id: 'foo',
        },
        headers: {
          authorization: 'Bearer 12345',
        },
        params: {
          containerID: 123,
          role: 'Writer',
        },
      }

      containerInvitationService.refreshInvitationToken = jest.fn(() => Promise.resolve())

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)
      const invitationController: any = new InvitationController()
      invitationController.isBearerHeaderValue = jest.fn(() => true)

      return expect(invitationController.refreshInvitationToken(req)).rejects.toThrow(
        ValidationError
      )
    })
  })

  describe('acceptProjectInvitationToken', () => {
    test('should call acceptProjectInvitationToken method on the invitation service', async () => {
      const containerInvitationService: any = DIContainer.sharedContainer.containerInvitationService

      const req: any = {
        body: {
          token: validInvitationToken.token,
        },
        headers: {
          authorization: 'Bearer 192837',
        },
        params: {
          containerType: ContainerType.project,
        },
      }

      containerInvitationService.acceptInvitationToken = jest.fn(() => Promise.resolve())

      AuthService.ensureValidAuthorizationBearer = jest.fn((_param: string) => 'string' as any)

      const invitationController = new InvitationController()
      await invitationController.acceptInvitationToken(req)

      expect(containerInvitationService.acceptInvitationToken).toHaveBeenCalled()
    })

    test('should fail if the token is not string', async () => {
      const req: any = {
        body: {
          token: 142971,
        },
        headers: {
          authorization: 'Bearer 142971',
        },
        params: {
          containerType: ContainerType.project,
        },
      }

      const invitationController = new InvitationController()

      return expect(invitationController.acceptInvitationToken(req)).rejects.toThrow(
        ValidationError
      )
    })

    test('should fail if the containerType is invalid', async () => {
      const req: any = {
        body: {
          token: 142971,
        },
        headers: {
          authorization: 'Bearer 142971',
        },
        params: {
          containerType: 'foobar',
        },
      }

      const invitationController = new InvitationController()

      return expect(invitationController.acceptInvitationToken(req)).rejects.toThrow(
        ValidationError
      )
    })
  })
})
