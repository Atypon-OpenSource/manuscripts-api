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

import * as _ from 'lodash'
import checksum from 'checksum'
import { ObjectTypes } from '@manuscripts/manuscripts-json-schema'

import { IContainerRequestService } from './IContainerRequestService'
import { ContainerRole } from '../../Models/ContainerModels'
import { ValidationError, UserRoleError } from '../../Errors'
import { User } from '../../Models/UserModels'
import { ContainerRequestRepository } from '../../DataAccess/ContainerRequestRepository/ContainerRequestRepository'
import { IContainerService } from '../Container/IContainerService'
import { UserProfileRepository } from '../../DataAccess/UserProfileRepository/UserProfileRepository'
import { UserService } from '../User/UserService'
import { EmailService } from '../Email/EmailService'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { ContainerRequestLike } from '../../DataAccess/Interfaces/Models'
import { ContainerService } from '../Container/ContainerService'

export class ContainerRequestService implements IContainerRequestService {
  constructor (
    private containerRequestRepository: ContainerRequestRepository,
    private userProfileRepository: UserProfileRepository,
    private userRepository: IUserRepository,
    private containerService: IContainerService,
    private emailService: EmailService
  ) {}

  public async create (user: User, containerID: string, role: ContainerRole) {
    const userID = user._id.replace('|', '_')
    const container = await this.containerService.getContainer(containerID)

    this.containerService.ensureValidRole(role)

    const userProfileID = UserService.profileID(userID)
    const userProfile = await this.userProfileRepository.getById(userProfileID)

    if (!userProfile) {
      throw new ValidationError(
        "Inviting user's profile could not be retrieved",
        userProfileID
      )
    }

    const currentUserRole = this.containerService.getUserRole(
      container,
      userID
    )

    if (
      currentUserRole &&
      ContainerService.compareRoles(currentUserRole, role) >= 0
    ) {
      throw new UserRoleError(
        `User ${userID} has a less limiting or the same role in the container as the requested role`,
        role
      )
    }
    const requestID = `${ObjectTypes.ContainerRequest}:${checksum(
      `${userID}-${containerID}`
    )}`

    const userRequest = await this.containerRequestRepository.getById(requestID)

    if (!userRequest) {
      const request: ContainerRequestLike = {
        _id: requestID,
        userID,
        role,
        containerID,
        objectType: ObjectTypes.ContainerRequest,
        userProfile
      }

      await this.containerRequestRepository.create(request, {})
    } else {
      await this.containerRequestRepository.patch(
        requestID,
        { role, userProfile },
        {}
      )
    }

    for (const ownerID of container.owners) {
      const owner = await this.userRepository.getById(ownerID)
      if (!owner) continue

      await this.emailService.sendContainerRequest(
        owner,
        user,
        container,
        role
      )
    }
  }

  public async response (
    requestID: string,
    acceptingUser: User,
    accept: boolean
  ) {
    const request = await this.containerRequestRepository.getById(requestID)

    if (!request) {
      throw new ValidationError(
        `Request with id ${requestID} does not exist`,
        requestID
      )
    }

    const userID = request.userID.replace('_', '|')

    const requestingUser = await this.userRepository.getById(userID)

    if (!requestingUser) {
      throw new ValidationError(
        `The user of the request was not found`,
        userID
      )
    }

    const container = await this.containerService.getContainer(
      request.containerID
    )

    if (!this.containerService.isOwner(container, acceptingUser._id)) {
      throw new UserRoleError(
        'Only owners can accept user requests.',
        acceptingUser._id
      )
    }

    const requestedRole = request.role as ContainerRole

    if (accept) {
      const currentUserRole = this.containerService.getUserRole(
        container,
        userID
      )

      if (!currentUserRole) {
        await this.containerService.addContainerUser(
          request.containerID,
          requestedRole,
          userID,
          acceptingUser
        )
      } else if (
        ContainerService.compareRoles(requestedRole, currentUserRole) === 1
      ) {
        await this.containerService.updateContainerUser(
          request.containerID,
          requestedRole,
          requestingUser
        )
      } else {
        throw new UserRoleError(
          'User already has a less limiting role',
          requestedRole
        )
      }
    }

    await this.containerRequestRepository.remove(requestID)

    await this.emailService.requestResponse(
      requestingUser,
      acceptingUser,
      container,
      requestedRole,
      accept
    )
  }
}
