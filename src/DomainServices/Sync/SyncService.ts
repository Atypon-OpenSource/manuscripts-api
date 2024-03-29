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
import { randomBytes } from 'crypto'
import { promisify } from 'util'
import { v4 as uuid_v4 } from 'uuid'

import { IUserProfileRepository } from '../../DataAccess/Interfaces/IUserProfileRepository'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import { ValidationError } from '../../Errors'
import { User } from '../../Models/UserModels'
import { timestamp } from '../../Utilities/JWT/LoginTokenPayload'
import { UserService } from '../User/UserService'
import { ISyncService } from './ISyncService'

const randomBytesPromisified = promisify(randomBytes)

/**
 * Number of bytes for the randomly generated user account passwords
 */
export const PASSWORD_BYTE_COUNT = 40

/**
 * Default expiry of the cookie, so we send it to the client with
 * the same expiry
 */

const randomPassword = () =>
  randomBytesPromisified(PASSWORD_BYTE_COUNT).then((buf) => buf.toString('hex'))

export const username = (userId: string) => {
  if (!userId.startsWith('User|')) {
    throw new ValidationError(`Invalid userId (${userId})`, userId)
  }
  return userId.replace('|', '_')
}

export class SyncService implements ISyncService {
  constructor(
    private userStatusRepository: IUserStatusRepository,
    private userProfileRepository: IUserProfileRepository
  ) {}

  public static async isAlive() {
    return Promise.resolve(true)
  }

  public async getOrCreateUserStatus(userId: string) {
    const id = this.userStatusRepository.fullyQualifiedId(userId)

    const userStatus = await this.userStatusRepository.getById(id)
    if (userStatus) {
      return userStatus
    }

    const newUserStatus = {
      _id: id,
      password: await randomPassword(),
      isVerified: true,
      createdAt: new Date(),
      blockUntil: null,
      deviceSessions: {},
    }

    await this.userStatusRepository.create(newUserStatus)

    return newUserStatus
  }

  public async removeUserStatus(userId: string) {
    const userStatus = await this.userStatusRepository.getById(userId)
    if (!userStatus) {
      throw new Error(`Failed to delete SyncGateway user ${userId}`)
    }
    await this.userStatusRepository.remove({ _id: userId })
  }

  public async createUserProfile(user: User) {
    const [firstName] = user.name.split(' ', 1)
    const lastName = user.name.substring(firstName.length + 1)

    const userProfileId = UserService.profileID(user._id)

    const date = timestamp()

    const userProfile: UserProfile = {
      _id: userProfileId,
      objectType: ObjectTypes.UserProfile,
      userID: username(user._id),
      bibliographicName: {
        _id: `${ObjectTypes.BibliographicName}:${uuid_v4()}`,
        objectType: ObjectTypes.BibliographicName,
        given: firstName,
        family: lastName,
      },
      email: user.email,
      createdAt: date,
      updatedAt: date,
    }

    return this.userProfileRepository.create(userProfile, userProfile.userID)
  }
}
