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

import checksum from 'checksum'
import { ContainerInvitation, ObjectTypes } from '@manuscripts/manuscripts-json-schema'

import { User, InvitationToken } from '../../Models/UserModels'
import {
  InvalidCredentialsError,
  ValidationError,
  ConflictingRecordError,
  UserRoleError,
  MissingContainerError,
  RecordGoneError,
  RoleDoesNotPermitOperationError,
} from '../../Errors'
import { IContainerInvitationService } from './IContainerInvitationService'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { UserActivityEventType } from '../../Models/UserEventModels'
import { UserActivityTrackingService } from '../UserActivity/UserActivityTrackingService'
import {
  ContainerRole,
  ContainerInvitationResponse,
  InvitedUserData,
  Container,
} from '../../Models/ContainerModels'
import { IContainerService } from '../Container/IContainerService'
import { getExpirationTime, timestamp } from '../../Utilities/JWT/LoginTokenPayload'
import { IInvitationTokenRepository } from '../../DataAccess/Interfaces/IInvitationTokenRepository'
import { ContainerService } from '../Container/ContainerService'
import { EmailService } from '../Email/EmailService'
import { ContainerInvitationLike } from '../../DataAccess/Interfaces/Models'
import { IUserProfileRepository } from '../../DataAccess/Interfaces/IUserProfileRepository'
import { UserService } from '../User/UserService'
import { ContainerInvitationRepository } from '../../DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { username as sgUsername } from '../Sync/SyncService'

const cryptoRandomString = require('crypto-random-string')

interface ContainerInvitationDetails {
  invitingUser: User
  container: Container
}

export class ContainerInvitationService implements IContainerInvitationService {
  /**
   * Invitation expiry time after sending it.
   */
  public static invitationExpiryInDays = () => getExpirationTime(30 * 24)

  /**
   * Invitation token timeout
   */
  public static invitationTokenTimeout = () => getExpirationTime(14 * 24) // 14 days

  constructor(
    private userRepository: IUserRepository,
    private userProfileRepository: IUserProfileRepository,
    private emailService: EmailService,
    private projectService: IContainerService,
    private libraryService: IContainerService,
    private libraryCollectionService: IContainerService,
    private containerInvitationRepository: ContainerInvitationRepository,
    private invitationTokenRepository: IInvitationTokenRepository,
    private activityTrackingService: UserActivityTrackingService
  ) {}

  public async inviteToContainer(
    invitingUserId: string,
    invitedUsers: InvitedUserData[],
    containerID: string,
    role: ContainerRole,
    message: string,
    skipEmail: boolean | undefined
  ): Promise<[string, string][]> {
    const { invitingUser, container } = await this.resolveInvitationDetails(
      invitingUserId,
      invitedUsers,
      containerID,
      role
    )

    const invitingUserProfileID = UserService.profileID(invitingUser._id)
    const invitingUserProfile = await this.userProfileRepository.getById(invitingUserProfileID)

    if (!invitingUserProfile) {
      throw new ValidationError(
        "Inviting user's profile could not be retrieved",
        invitingUserProfileID
      )
    }

    const invitations: [string, string][] = []

    for (const invitedUser of invitedUsers) {
      const invitedUserDoc = await this.userRepository.getOne({
        email: invitedUser.email.toLowerCase(),
      })
      let invitedUserID
      if (invitedUserDoc) {
        invitedUserID = invitedUserDoc._id.replace('|', '_')
        if (ContainerService.isContainerUser(container, invitedUserID)) {
          throw new ConflictingRecordError(
            'User already a collaborator on the container',
            invitedUserDoc
          )
        }
      }

      const invitationTupleHash = checksum(
        `${invitingUser.email}-${invitedUser.email}-${containerID}`,
        { algorithm: 'sha1' }
      )

      const invitationId = `${ObjectTypes.ContainerInvitation}:${invitationTupleHash}`
      let invitation = await this.containerInvitationRepository.getById(invitationId)

      if (invitation) {
        await this.containerInvitationRepository.patch(invitationId, { role, message })
      } else {
        const newInvitation: ContainerInvitationLike = {
          _id: invitationTupleHash,
          objectType: ObjectTypes.ContainerInvitation,
          invitingUserID: sgUsername(invitingUser._id),
          invitingUserProfile,
          invitedUserEmail: invitedUser.email,
          invitedUserName: invitedUser.name,
          invitedUserID,
          containerID,
          containerTitle: ContainerService.containerTitle(container),
          role,
          message,
        }

        await this.containerInvitationRepository.create(newInvitation)
      }

      if (!skipEmail) {
        await this.emailService.sendContainerInvitation(
          invitedUser,
          invitingUser,
          invitationId,
          container,
          role
        )
      }

      invitations.push([invitedUser.email, invitationId])
    }

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      invitingUser._id,
      UserActivityEventType.SendInvitation,
      null,
      null
    )

    return invitations
  }

  /* istanbul ignore next */
  private containerService(containerID: string) {
    if (containerID.startsWith('MPProject')) {
      return this.projectService
    }

    if (containerID.startsWith('MPLibrary')) {
      return this.libraryService
    }

    if (containerID.startsWith('MPLibraryCollection')) {
      return this.libraryCollectionService
    }

    throw new ValidationError('Invalid container id.', containerID)
  }

  private async resolveInvitationDetails(
    invitingUserId: string,
    invitedUsers: InvitedUserData[],
    containerID: string,
    role: ContainerRole
  ): Promise<ContainerInvitationDetails> {
    const invitingUser = this.ensureValidUser(await this.userRepository.getById(invitingUserId))

    if (invitedUsers.length === 0) {
      throw new ValidationError('invitedUsers unexpectedly empty', invitedUsers)
    }

    for (const invitedUser of invitedUsers) {
      if (invitedUser.email === invitingUser.email) {
        throw new ValidationError('Inviting user can not invite himself.', invitingUser.email)
      }
    }

    if (!(role in ContainerRole)) {
      throw new ValidationError(`'${role}' is an invalid role`, role)
    }

    const container = await this.containerService(containerID).getContainer(containerID)

    const owners = container.owners
    if (owners.indexOf(sgUsername(invitingUser._id)) < 0) {
      throw new ValidationError(
        `User ${invitingUser.email} are not allowed to invite, because he does not own the container.`,
        invitingUser.email
      )
    }

    return { invitingUser, container }
  }

  public async rejectContainerInvite(invitationId: string): Promise<void> {
    const invitation = await this.containerInvitationRepository.getById(invitationId)

    if (!invitation) {
      throw new ValidationError(`Invitation with id ${invitationId} does not exist`, invitationId)
    }

    await this.containerInvitationRepository.remove(invitationId)
  }

  public static ensureValidRole(role: string): ContainerRole {
    if (!(role in ContainerRole)) {
      throw new ValidationError(`Invalid role '${role}'.`, role)
    }

    return role as ContainerRole
  }

  public async acceptContainerInvite(
    invitationId: string,
    user: User,
    skipEmail?: boolean
  ): Promise<ContainerInvitationResponse> {
    const invitation = await this.containerInvitationRepository.getById(invitationId)

    if (!invitation) {
      throw new RecordGoneError('The invitation does not exist.')
    }

    const invitedUser = await this.checkInvitedUser(invitation, user)

    let container
    try {
      container = await this.containerService(invitation.containerID).getContainer(
        invitation.containerID
      )
    } catch (e) {
      await this.containerInvitationRepository.remove(invitationId)
      throw new MissingContainerError(invitation.containerID)
    }

    const role = ContainerInvitationService.ensureValidRole(invitation.role)

    const invitingUser = await this.userRepository.getById(
      invitation.invitingUserID.replace('_', '|')
    )
    if (!invitingUser) {
      throw new ValidationError('Inviting user does not exist', invitation.invitingUserID)
    }

    let roleToAssign = role
    let invitationToAccept = invitation
    const invitations = await this.containerInvitationRepository.getInvitationsForUser(
      container._id,
      invitedUser.email
    )

    const ownerInvitation = invitations.find(
      (invitation) => invitation.role === ContainerRole.Owner
    )
    const writerInvitation = invitations.find(
      (invitation) => invitation.role === ContainerRole.Writer
    )

    if (
      ownerInvitation &&
      ContainerService.compareRoles(invitation.role as ContainerRole, ContainerRole.Owner) === -1
    ) {
      roleToAssign = ContainerRole.Owner
      invitationToAccept = ownerInvitation
    } else if (writerInvitation && role === ContainerRole.Viewer) {
      roleToAssign = ContainerRole.Writer
      invitationToAccept = writerInvitation
    }

    await Promise.all(
      invitations
        .filter((invitation) => invitation._id !== invitationToAccept._id)
        .map((invitation) => this.containerInvitationRepository.remove(invitation._id))
    )

    const response = await this.handleInvitation(
      container,
      invitationToAccept,
      roleToAssign,
      invitingUser,
      invitedUser,
      skipEmail
    )
    return response
  }

  public async markInvitationAsAccepted(invitationId: string) {
    await this.containerInvitationRepository.patch(invitationId, { acceptedAt: timestamp() })
  }

  public async uninvite(userId: string, invitationId: string): Promise<void> {
    const user = await this.userRepository.getById(userId)

    if (!user) {
      throw new InvalidCredentialsError(`User not found`)
    }

    const invitation = await this.containerInvitationRepository.getById(invitationId)

    if (!invitation) {
      throw new ValidationError(`Invitation with id ${invitationId} does not exist`, invitationId)
    }

    const container = await this.containerService(invitation.containerID).getContainer(
      invitation.containerID
    )

    const owners = container.owners

    if (owners.indexOf(sgUsername(user._id)) < 0) {
      throw new RoleDoesNotPermitOperationError('Only owners can uninvite other users.', user.email)
    }

    await this.containerInvitationRepository.remove(invitationId)
  }

  public async resolveInvitationTokenDetails(
    userId: string,
    containerID: string,
    role: ContainerRole
  ): Promise<void> {
    const user = this.ensureValidUser(await this.userRepository.getById(userId))

    if (role !== ContainerRole.Viewer && role !== ContainerRole.Writer) {
      throw new ValidationError(`role '${role}' is not valid`, role)
    }

    const container = await this.containerService(containerID).getContainer(containerID)

    if (!ContainerService.isOwner(container, user._id)) {
      throw new UserRoleError(`Only owners can invite other users.`, user._id)
    }
  }

  public async requestInvitationToken(
    clientId: string,
    containerID: string,
    permittedRole: ContainerRole
  ): Promise<InvitationToken> {
    await this.resolveInvitationTokenDetails(clientId, containerID, permittedRole)

    let invitationToken = await this.invitationTokenRepository.getById(
      `InvitationToken|${containerID}+${permittedRole}`
    )

    if (!invitationToken) {
      //const expiry: number = ContainerInvitationService.invitationTokenTimeout()
      const tokenId = `${containerID}+${permittedRole}`

      const token = cryptoRandomString(40)

      invitationToken = {
        _id: tokenId,
        token,
        containerID,
        permittedRole,
      }
      return this.invitationTokenRepository.create(invitationToken)
    } else {
      await this.invitationTokenRepository.touch(
        invitationToken._id,
        ContainerInvitationService.invitationTokenTimeout()
      )
      return invitationToken
    }
  }

  public async refreshInvitationToken(
    clientId: string,
    containerID: string,
    role: ContainerRole
  ): Promise<InvitationToken> {
    await this.resolveInvitationTokenDetails(clientId, containerID, role)

    let invitationToken = await this.invitationTokenRepository.getById(
      `InvitationToken|${containerID}+${role}`
    )

    if (!invitationToken) {
      throw new InvalidCredentialsError(`Token not found`)
    }

    await this.invitationTokenRepository.touch(
      invitationToken._id,
      ContainerInvitationService.invitationTokenTimeout()
    )
    return invitationToken
  }

  public async acceptInvitationToken(
    token: string,
    invitedUserId: string,
    skipEmail?: boolean
  ): Promise<ContainerInvitationResponse> {
    const invitedUser = await this.userRepository.getById(invitedUserId)

    if (!invitedUser) {
      throw new InvalidCredentialsError('User not found')
    }

    const invitationToken = await this.invitationTokenRepository.getOne({
      token,
    })

    if (!invitationToken) {
      throw new RecordGoneError('The invitation does not exist.')
    }

    const { containerID, permittedRole } = invitationToken

    const container = await this.containerService(containerID).getContainer(containerID)

    if (permittedRole !== ContainerRole.Viewer && permittedRole !== ContainerRole.Writer) {
      throw new ValidationError('Invalid role', permittedRole)
    }

    return this.addUserToContainer(container, invitedUser, permittedRole, skipEmail)
  }

  public async updateInvitedUserID(userID: string, userEmail: string) {
    const invitations = await this.containerInvitationRepository.getAllByEmail(userEmail)
    for (let invitation of invitations) {
      await this.containerInvitationRepository.patch(invitation._id, { invitedUserID: userID })
    }
  }

  // tslint:disable-next-line:cyclomatic-complexity
  private async addUserToContainer(
    container: Container,
    user: User,
    permittedRole: ContainerRole,
    skipEmail?: boolean
  ): Promise<ContainerInvitationResponse> {
    const invitations = await this.containerInvitationRepository.getInvitationsForUser(
      container._id,
      user.email
    )

    let roleToAssign = permittedRole
    let invitationToAccept: ContainerInvitation | null = null

    for (let invitation of invitations) {
      if (ContainerService.compareRoles(invitation.role as ContainerRole, roleToAssign) >= 0) {
        roleToAssign = invitation.role as ContainerRole
        invitationToAccept = invitation
      } else {
        await this.containerInvitationRepository.remove(invitation._id)
      }
    }

    const userID = user._id

    if (invitationToAccept) {
      await this.containerService(invitationToAccept.containerID).addContainerUser(
        invitationToAccept.containerID,
        roleToAssign,
        userID,
        null,
        skipEmail
      )
      await this.markInvitationAsAccepted(invitationToAccept._id)
      return {
        containerID: container._id,
        message: 'Invitation with a less limiting role was found and accepted.',
      }
    }

    const currentUserRole = this.containerService(container._id).getUserRole(container, userID)

    let message
    if (!currentUserRole) {
      await this.containerService(container._id).addContainerUser(
        container._id,
        permittedRole,
        userID,
        null,
        skipEmail
      )
      const containerTitle = ContainerService.containerTitle(container)
      message = containerTitle
        ? `You have been added to project "${containerTitle}".`
        : 'You have been added to a project.'
    } else if (currentUserRole === ContainerRole.Viewer && permittedRole === ContainerRole.Writer) {
      await this.containerService(container._id).updateContainerUser(
        container._id,
        permittedRole,
        user
      )
      message = 'Your role was updated successfully.'
    } else if (currentUserRole === permittedRole) {
      message = 'You already have this role.'
    } else {
      message = 'Your current role in the project is already of higher privilege.'
    }
    return {
      containerID: container._id,
      message,
    }
  }

  private async checkInvitedUser(invitation: ContainerInvitationLike, user: User): Promise<User> {
    if (invitation.invitedUserEmail !== user.email) {
      throw new InvalidCredentialsError('Only the invited user could accept invitation.')
    }

    return user
  }

  private ensureValidUser(user: User | null): User {
    if (!user) {
      throw new InvalidCredentialsError('User not found')
    }

    return user
  }

  private async handleInvitation(
    container: Container,
    invitationToAccept: ContainerInvitationLike,
    roleToAssign: ContainerRole,
    invitingUser: User,
    invitedUser: User,
    skipEmail?: boolean
  ): Promise<ContainerInvitationResponse> {
    const currentUserRole = this.containerService(invitationToAccept.containerID).getUserRole(
      container,
      invitedUser._id
    )
    let message
    if (!currentUserRole) {
      await this.containerService(invitationToAccept.containerID).addContainerUser(
        invitationToAccept.containerID,
        roleToAssign,
        invitedUser._id,
        invitingUser,
        skipEmail
      )
      const containerTitle = ContainerService.containerTitle(container)

      message = containerTitle
        ? `You have been added to project "${containerTitle}".`
        : 'You have been added to a project.'
      await this.markInvitationAsAccepted(invitationToAccept._id)
    } else if (invitationToAccept.acceptedAt) {
      message = `Invitation already accepted.`
    } else if (ContainerService.compareRoles(roleToAssign, currentUserRole) === 1) {
      await this.containerService(invitationToAccept.containerID).updateContainerUser(
        container._id,
        roleToAssign,
        invitedUser
      )
      message = 'Your role was updated successfully.'
      await this.markInvitationAsAccepted(invitationToAccept._id)
    } else if (currentUserRole === roleToAssign) {
      message = 'You already have this role.'
      await this.containerInvitationRepository.remove(invitationToAccept._id)
    } else {
      message = 'Your current role in the project is already of higher privilege.'
      await this.containerInvitationRepository.remove(invitationToAccept._id)
    }
    return {
      containerID: container._id,
      message,
    }
  }
}
