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

import { Request } from 'express'
import { isString } from '../../../util'

import { IInvitationController } from './IInvitationController'
import { ValidationError } from '../../../Errors'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { AuthService } from '../../../DomainServices/Auth/AuthService'
import {
  ContainerRole,
  ContainerInvitationResponse,
  ContainerType,
} from '../../../Models/ContainerModels'
import { InvitationToken, ensureValidUser } from '../../../Models/UserModels'
import { ContainedBaseController } from '../../ContainedBaseController'

export class InvitationController extends ContainedBaseController implements IInvitationController {
  async invite(req: Request): Promise<void> {
    const { invitedUsersEmails, message } = req.body
    const user = req.user

    if (!user) {
      throw new ValidationError('User not found', user)
    }

    AuthService.ensureValidAuthorizationBearer(req.headers.authorization)

    if (!Array.isArray(invitedUsersEmails)) {
      throw new ValidationError('should have a list of invited emails.', invitedUsersEmails)
    }

    if (message && !isString(message)) {
      throw new ValidationError('message should be string', message)
    }

    return DIContainer.sharedContainer.invitationService.invite(
      user._id,
      invitedUsersEmails,
      message
    )
  }

  async inviteToContainer(req: Request): Promise<[string, string][]> {
    const { invitedUsers, role, message, skipEmail } = req.body
    const { containerID } = req.params
    const user = ensureValidUser(req.user)

    AuthService.ensureValidAuthorizationBearer(req.headers.authorization)

    if (!Array.isArray(invitedUsers)) {
      throw new ValidationError('should have a list of invited emails.', invitedUsers)
    }

    if (!isString(containerID)) {
      throw new ValidationError('containerId should be string', containerID)
    }

    if (!isString(role)) {
      throw new ValidationError('role should be string', role)
    }

    if (!message || !isString(message)) {
      throw new ValidationError('message should be string', message)
    }
    return DIContainer.sharedContainer.containerInvitationService.inviteToContainer(
      user._id,
      invitedUsers,
      containerID,
      role,
      message,
      skipEmail
    )
  }

  async accept(req: Request): Promise<ContainerInvitationResponse> {
    const { invitationId, password, name, skipEmail } = req.body

    if (!isString(invitationId)) {
      throw new ValidationError('invitationId should be string.', invitationId)
    }

    if (invitationId.startsWith('MPInvitation')) {
      if (password && !isString(password)) {
        throw new ValidationError('password should be string', password)
      }

      if (name && !isString(name)) {
        throw new ValidationError('name should be string', name)
      }
      return DIContainer.sharedContainer.invitationService.accept(invitationId, password, name)
    } else {
      const user = req.user
      if (!user) {
        throw new ValidationError('User not found', user)
      }

      return DIContainer.sharedContainer.containerInvitationService.acceptContainerInvite(
        invitationId,
        user,
        skipEmail
      )
    }
  }

  async reject(req: Request): Promise<void> {
    const { invitationId } = req.body

    if (!isString(invitationId)) {
      throw new ValidationError('invitationId should be a string', invitationId)
    }

    if (invitationId.startsWith('MPInvitation')) {
      return DIContainer.sharedContainer.invitationService.reject(invitationId)
    } else {
      return DIContainer.sharedContainer.containerInvitationService.rejectContainerInvite(
        invitationId
      )
    }
  }

  async uninvite(req: Request): Promise<void> {
    const { invitationId } = req.body
    const user = req.user

    if (!user) {
      throw new ValidationError('User not found', user)
    }

    AuthService.ensureValidAuthorizationBearer(req.headers.authorization)

    if (!isString(invitationId)) {
      throw new ValidationError('invitationId should be a string', invitationId)
    }

    return DIContainer.sharedContainer.containerInvitationService.uninvite(user._id, invitationId)
  }

  public ensureValidInvitationParams(params: any): { containerID: string; role: ContainerRole } {
    const { containerID, role } = params
    if (!isString(containerID)) {
      throw new ValidationError('containerID should be string', containerID)
    }

    if (!(role in ContainerRole)) {
      throw new ValidationError('role should be valid', role)
    }

    return { containerID, role }
  }

  async requestInvitationToken(req: Request): Promise<InvitationToken> {
    const { containerID, role } = this.ensureValidInvitationParams(req.params)
    const user = ensureValidUser(req.user)

    return DIContainer.sharedContainer.containerInvitationService.requestInvitationToken(
      user._id,
      containerID,
      role
    )
  }

  async refreshInvitationToken(req: Request): Promise<InvitationToken> {
    const { containerID, role } = this.ensureValidInvitationParams(req.params)
    const user = ensureValidUser(req.user)

    return DIContainer.sharedContainer.containerInvitationService.refreshInvitationToken(
      user._id,
      containerID,
      role
    )
  }

  async acceptInvitationToken(req: Request): Promise<ContainerInvitationResponse> {
    const { token, skipEmail } = req.body
    const { containerType } = req.params

    if (!(containerType in ContainerType)) {
      throw new ValidationError('containerType should be valid', containerType)
    }

    if (!isString(token)) {
      throw new ValidationError('Token must be string', token)
    }

    const authHeader = AuthService.ensureValidAuthorizationBearer(req.headers.authorization)

    return DIContainer.sharedContainer.containerInvitationService.acceptInvitationToken(
      token,
      authHeader.userId,
      skipEmail
    )
  }
}
