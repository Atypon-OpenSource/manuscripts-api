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

import { ObjectTypes, UserProfile } from '@manuscripts/json-schema'
import { compare } from 'bcrypt'
import checksum from 'checksum'
import jwt from 'jsonwebtoken'

import { config } from '../../Config/Config'
import { ISingleUseTokenRepository } from '../../DataAccess/Interfaces/ISingleUseTokenRepository'
import { IUserProfileRepository } from '../../DataAccess/Interfaces/IUserProfileRepository'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import { UserProfileLike } from '../../DataAccess/Interfaces/Models'
import { ProjectRepository } from '../../DataAccess/ProjectRepository/ProjectRepository'
import { DIContainer } from '../../DIContainer/DIContainer'
import { username as sgUsername } from '../../DomainServices/Sync/SyncService'
import {
  InvalidCredentialsError,
  InvalidPasswordError,
  MissingUserStatusError,
  RecordNotFoundError,
  ValidationError,
} from '../../Errors'
import { UserActivityEventType } from '../../Models/UserEventModels'
import { getExpirationTime, isLoginTokenPayload } from '../../Utilities/JWT/LoginTokenPayload'
import { isScopedTokenPayload } from '../../Utilities/JWT/ScopedTokenPayload'
import { ISyncService } from '../Sync/ISyncService'
import { UserActivityTrackingService } from '../UserActivity/UserActivityTrackingService'
import { IUserService } from './IUserService'

export class UserService implements IUserService {
  constructor(
    private userRepository: IUserRepository,
    private singleUseTokenRepository: ISingleUseTokenRepository,
    private activityTrackingService: UserActivityTrackingService,
    private userStatusRepository: IUserStatusRepository,
    private syncService: ISyncService,
    private userProfileRepository: IUserProfileRepository,
    private projectRepository: ProjectRepository
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
          await this.deleteUser(user._id)
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
    await this.userProfileRepository.purge(userProfileId)
    await this.syncService.removeUserStatus(user._id)
    await this.singleUseTokenRepository.remove({ userId: user._id })

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
   * @param password User's password
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
    const payload = jwt.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const userProfileID = UserService.profileID(payload.userId)
    return this.userProfileRepository.getById(userProfileID, sgUsername(payload.userId))

    // TODO: Get the invitations
  }

  public async authenticateUser(token: string): Promise<void> {
    const payload = jwt.decode(token)
    if (isScopedTokenPayload(payload)) {
      const user = await this.userRepository.getById(payload.sub.replace('_', '|'))
      if (!user) {
        throw new InvalidCredentialsError(`User not found.`)
      }
    } else if (isLoginTokenPayload(payload)) {
      const user = await this.userRepository.getById(payload.userId)

      if (!user) {
        throw new InvalidCredentialsError(`User not found.`)
      }
    } else {
      try {
        // Server secret based authentication
        jwt.verify(token, config.auth.serverSecret)
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
        await this.projectRepository.patch(project._id, {
          _id: project._id,
          owners,
          writers,
          viewers,
        })
      }
    }
  }

  public async getProjectUserProfiles(containerId: string): Promise<UserProfile[]> {
    const project = await this.projectRepository.getById(containerId)
    if (!project) {
      throw new RecordNotFoundError(containerId)
    }
    const annotator = project.annotators ?? []
    const proofers = project.proofers ?? []
    const editors = project.editors ?? []
    const projectUsers = project.owners.concat(
      editors,
      project.writers,
      project.viewers,
      annotator,
      proofers
    )
    const userProfiles: UserProfile[] = []
    for (const id of projectUsers) {
      userProfiles.push(await DIContainer.sharedContainer.userProfileRepository.getByUserId(id))
    }
    return userProfiles
  }
}
