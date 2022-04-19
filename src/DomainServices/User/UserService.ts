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

import { compare } from 'bcrypt'
import * as jsonwebtoken from 'jsonwebtoken'
import checksum from 'checksum'
import { ObjectTypes } from '@manuscripts/manuscripts-json-schema'

import {
  MissingUserStatusError,
  InvalidCredentialsError,
  InvalidPasswordError,
  NoTokenError,
  ValidationError,
} from '../../Errors'
import { IUserService } from './IUserService'
import { ISyncService } from '../Sync/ISyncService'
import { ISingleUseTokenRepository } from '../../DataAccess/Interfaces/ISingleUseTokenRepository'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { IUserProfileRepository } from '../../DataAccess/Interfaces/IUserProfileRepository'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import { IUserTokenRepository } from '../../DataAccess/Interfaces/IUserTokenRepository'
import { UserActivityEventType } from '../../Models/UserEventModels'
import { UserActivityTrackingService } from '../UserActivity/UserActivityTrackingService'
import { isLoginTokenPayload, getExpirationTime } from '../../Utilities/JWT/LoginTokenPayload'
import { InvitationRepository } from '../../DataAccess/InvitationRepository/InvitationRepository'
import { ContainerInvitationRepository } from '../../DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { config } from '../../Config/Config'
import { EmailService } from '../Email/EmailService'
import { UserProfileLike } from '../../DataAccess/Interfaces/Models'
import { ProjectRepository } from '../../DataAccess/ProjectRepository/ProjectRepository'
import { username as sgUsername } from '../../DomainServices/Sync/SyncService'
import { ContainerRequestRepository } from '../../DataAccess/ContainerRequestRepository/ContainerRequestRepository'
import { UserCollaboratorRepository } from '../../DataAccess/UserCollaboratorRepository/UserCollaboratorRepository'
import { isScopedTokenPayload } from '../../Utilities/JWT/ScopedTokenPayload'

export class UserService implements IUserService {
  constructor(
    private userRepository: IUserRepository,
    private singleUseTokenRepository: ISingleUseTokenRepository,
    private activityTrackingService: UserActivityTrackingService,
    private userStatusRepository: IUserStatusRepository,
    private userTokenRepository: IUserTokenRepository,
    private invitationRepository: InvitationRepository,
    private containerInvitationRepository: ContainerInvitationRepository,
    private containerRequestRepository: ContainerRequestRepository,
    private emailService: EmailService,
    private syncService: ISyncService,
    private userProfileRepository: IUserProfileRepository,
    private projectRepository: ProjectRepository,
    private userCollaboratorRepository: UserCollaboratorRepository
  ) {}

  /**
   * Retrieve email from user id.
   */
  public static removeUserIDPrefix(id: string) {
    if (id.startsWith('User|')) {
      return id.replace('User|', '')
    } else if (id.startsWith('User_')) {
      return id.replace('User_', '')
    }

    throw new ValidationError(`Invalid id ${id}`, id)
  }

  /**
   * Deletes users from the system and all related data after a date passed.
   */
  public async clearUsersData(): Promise<void> {
    const users = await this.userRepository.getUsersToDelete()
    if (users && users.length) {
      await Promise.all(
        users.map(async (user) => {
          const userDeleted = await this.deleteUser(user._id)
          if (userDeleted && !config.auth.skipVerification) {
            await this.emailService.sendAccountDeletionConfirmation(user)
          }
        })
      )
    }
  }

  /**
   * Deletes all related data to user.
   * @param userId User's id
   */
  public async deleteUser(userId: string): Promise<boolean> {
    const user = await this.userRepository.getById(userId)

    if (!user) {
      throw new InvalidCredentialsError('User not found.')
    }

    const userProfileId = `MPUserProfile:${checksum(user.email, {
      algorithm: 'sha1',
    })}`

    await this.removeUserFromProjects(user._id)
    await this.userCollaboratorRepository.clearUserCollaborators(user._id)
    await this.userProfileRepository.purge(userProfileId)
    await this.syncService.removeUserStatus(user._id)
    await this.singleUseTokenRepository.remove({ userId: user._id })
    await this.userTokenRepository.remove({ userId: user._id })

    await this.invitationRepository.removeByUserIdAndEmail(user._id, user.email)
    await this.containerInvitationRepository.removeByUserIdAndEmail(user._id, user.email)
    await this.containerRequestRepository.removeByUserIdAndEmail(user._id, user.email)

    await this.userStatusRepository.remove({
      _id: this.userStatusRepository.userStatusId(user._id),
    })
    const userDeleted = await this.userRepository.remove({ _id: user._id })

    if (userDeleted) {
      // tslint:disable-next-line: no-floating-promises
      this.activityTrackingService.createEvent(
        user._id,
        UserActivityEventType.DeleteAccount,
        null,
        null
      )
    }

    return userDeleted
  }

  /**
   * Sets the user deleteAt property
   * @param userId User's id
   */
  public async markUserForDeletion(userId: string, password?: string): Promise<void> {
    const user = await this.userRepository.getById(userId)

    if (!user) {
      throw new InvalidCredentialsError(`User not found.`)
    }

    if (config.auth.enableNonConnectAuth || process.env.NODE_ENV === 'test') {
      if (!password) {
        throw new ValidationError('Password must be set', user)
      }

      const userStatus = await this.userStatusRepository.statusForUserId(user._id)

      if (!userStatus) {
        throw new MissingUserStatusError(user._id)
      }

      const matchedPassword: boolean = await compare(password, userStatus.password)

      if (!matchedPassword) {
        throw new InvalidPasswordError(user)
      }
    }

    const deleteAt = getExpirationTime(30 * 24)

    await this.userRepository.patch(userId, { deleteAt: deleteAt })

    if (!config.auth.skipVerification) {
      await this.emailService.sendAccountDeletionNotification(user)
    }
  }

  /**
   * Sets the user deleteAt property to undefined
   * @param userId User's id
   */
  public async unmarkUserForDeletion(userId: string): Promise<void> {
    const user = await this.userRepository.getById(userId)

    if (!user) {
      throw new InvalidCredentialsError(`User not found.`)
    }

    const deleteAt = undefined
    await this.userRepository.patch(userId, { deleteAt: deleteAt })
  }

  public static profileID(userID: string) {
    const id = UserService.removeUserIDPrefix(userID)
    return `${ObjectTypes.UserProfile}:${checksum(id, { algorithm: 'sha1' })}`
  }

  /**
   * Gets user's profile
   * @param token User's token
   */
  public async profile(token: string): Promise<UserProfileLike | null> {
    const payload = jsonwebtoken.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const userProfileID = UserService.profileID(payload.userId)
    return this.userProfileRepository.getById(userProfileID, sgUsername(payload.userId))

    // TODO: Get the invitations
  }

  public async authenticateUser(token: string): Promise<void> {
    const payload = jsonwebtoken.decode(token)
    if (isScopedTokenPayload(payload)) {
      const user = await this.userRepository.getById(payload.sub.replace('_', '|'))
      if (!user) {
        throw new InvalidCredentialsError(`User not found.`)
      }
    } else if (isLoginTokenPayload(payload)) {
      const id = this.userTokenRepository.fullyQualifiedId(payload.tokenId)

      const userToken = await this.userTokenRepository.getById(id)

      if (!userToken) {
        throw new NoTokenError(id)
      }

      const user = await this.userRepository.getById(payload.userId)

      if (!user) {
        throw new InvalidCredentialsError(`User not found.`)
      }
    } else {
      try {
        // Server secret based authentication
        jsonwebtoken.verify(token, config.auth.serverSecret)
      } catch (e) {
        throw new InvalidCredentialsError('Unexpected token payload.')
      }
    }
  }

  private async removeUserFromProjects(userId: string) {
    const sgUserID = sgUsername(userId)
    const userProjects = await this.projectRepository.getUserContainers(sgUserID)

    for (const project of userProjects) {
      const { owners, writers, viewers } = project

      const ownerIndex = owners.indexOf(sgUserID)
      const writerIndex = writers.indexOf(sgUserID)
      const viewerIndex = viewers.indexOf(sgUserID)

      if (ownerIndex > -1) {
        owners.splice(ownerIndex, 1)
      }

      if (writerIndex > -1) {
        writers.splice(ownerIndex, 1)
      }

      if (viewerIndex > -1) {
        viewers.splice(ownerIndex, 1)
      }

      if (!owners.length) {
        await this.projectRepository.removeWithAllResources(project._id)
      } else {
        if (!project._deleted) {
          await this.projectRepository.patch(project._id, {
            _id: project._id,
            owners,
            writers,
            viewers,
          })
        }
      }
    }
  }
}
