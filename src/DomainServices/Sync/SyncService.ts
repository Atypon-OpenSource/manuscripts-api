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

import { UserProfile, ObjectTypes } from '@manuscripts/manuscripts-json-schema'
import { v4 as uuid_v4 } from 'uuid'
import { randomBytes } from 'crypto'
import { promisify } from 'util'

import { ValidationError } from '../../Errors'
import { BucketKey } from '../../Config/ConfigurationTypes'
import { User } from '../../Models/UserModels'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import { ISyncService } from './ISyncService'
import { timestamp } from '../../Utilities/JWT/LoginTokenPayload'
import { UserService } from '../User/UserService'
import { IUserProfileRepository } from 'src/DataAccess/Interfaces/IUserProfileRepository'
import { AccessControlRepository } from '../../DataAccess/AccessControlRepository'

const randomBytesPromisified = promisify(randomBytes)

/**
 * Number of bytes for the randomly generated sync_gateway user account passwords
 */
export const SYNC_GATEWAY_PASSWORD_BYTE_COUNT = 40
/**
 * Name of the cookie sync_gateway is expecting
 */
export const SYNC_GATEWAY_COOKIE_NAME = 'SyncGatewaySession'
/**
 * Default expiry of the sync_gateway cookie, so we send it to the client with
 * the same expiry
 */
export const SYNC_GATEWAY_COOKIE_EXPIRY_IN_MS = 24 * 60 * 60 * 1000

export const GATEWAY_BUCKETS: Array<BucketKey> = [BucketKey.Data, BucketKey.DerivedData]

const randomPassword = () =>
  randomBytesPromisified(SYNC_GATEWAY_PASSWORD_BYTE_COUNT).then((buf) => buf.toString('hex'))

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

  public async gatewayAccountExists(userId: string): Promise<boolean> {
    const id = this.userStatusRepository.fullyQualifiedId(userId)

    const exists = await this.userStatusRepository.getById(id)
    if (exists) {
      return true
    }

    return false
  }

  // Creates a sync_gateway account
  public async createGatewayAccount(userId: string) {
    const id = this.userStatusRepository.fullyQualifiedId(userId)

    const exists = await this.userStatusRepository.getById(id)
    if (exists) {
      return id
    }

    const userStatus = {
      _id: id,
      password: await randomPassword(),
      isVerified: true,
      createdAt: new Date(),
      blockUntil: null,
      deviceSessions: {},
    }

    await this.userStatusRepository.create(userStatus)

    return id
  }

  /**
   * removes a sync_gateway account.
   */
  public async removeGatewayAccount(userId: string) {
    const userStatus = await this.userStatusRepository.getById(userId)
    if (!userStatus) {
      throw new Error(`Failed to delete SyncGateway user ${userId}`)
    }
    await this.userStatusRepository.remove({ _id: userId })
  }

  public async createGatewayContributor(user: User) {
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

    await AccessControlRepository.channel(
      [userProfileId + '-readwrite', userProfile.userID + '-readwrite'],
      userProfile.userID
    )
    await AccessControlRepository.access(
      [userProfile.userID],
      [userProfileId + '-readwrite', userProfile.userID + '-readwrite']
    )

    return this.userProfileRepository.create(userProfile, userProfile.userID)
  }
}
