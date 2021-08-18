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

import * as HttpStatus from 'http-status-codes'
import request from 'request-promise-native'

import { UserProfile, ObjectTypes } from '@manuscripts/manuscripts-json-schema'
import { v4 as uuid_v4 } from 'uuid'
import { randomBytes } from 'crypto'
import { promisify } from 'util'

import { SyncError, ValidationError, GatewayInaccessibleError } from '../../Errors'
import { BucketKey } from '../../Config/ConfigurationTypes'
import {
  appDataAdminGatewayURI, appDataAdminGatewayBaseURI,
  appDataPublicGatewayBaseURI
} from '../../Config/ConfigAccessors'
import { UserStatus, User } from '../../Models/UserModels'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import { ISyncService } from './ISyncService'
import { timestamp } from '../../Utilities/JWT/LoginTokenPayload'
import { UserService } from '../User/UserService'

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

export const GATEWAY_BUCKETS: Array<BucketKey> = [
  BucketKey.Data,
  BucketKey.DerivedData,
  BucketKey.Discussions
]

const randomPassword = () =>
  randomBytesPromisified(SYNC_GATEWAY_PASSWORD_BYTE_COUNT)
    .then(buf => buf.toString('hex'))

export const username = (userId: string) => {
  if (!userId.startsWith('User|')) {
    throw new ValidationError(`Invalid userId (${userId})`, userId)
  }
  return userId.replace('|', '_')
}

export class SyncService implements ISyncService {
  constructor (
    private userStatusRepository: IUserStatusRepository
  ) {}

  public static async isAlive () {
    return Promise.all([SyncService.isAdminInterfaceAlive(), SyncService.isPublicInterfaceAlive()])
  }

  private static async isAdminInterfaceAlive (): Promise<boolean> {
    const url = appDataAdminGatewayBaseURI()

    const options = {
      url: url,
      method: 'HEAD',
      resolveWithFullResponse: true
    }

    let response: any
    try {
      response = await request(options)
    } catch (error) {
      throw new GatewayInaccessibleError(url)
    }
    if (response.statusCode === HttpStatus.OK) {
      return true
    } else {
      throw new SyncError(`Header request to URL ${url} is failing`, response)
    }
  }

  private static async isPublicInterfaceAlive (): Promise<boolean> {
    const url = appDataPublicGatewayBaseURI()

    const options = {
      url: url,
      method: 'HEAD',
      resolveWithFullResponse: true
    }

    let response: any
    try {
      response = await request(options)
    } catch (error) {
      throw new GatewayInaccessibleError(url)
    }
    if (response.statusCode === HttpStatus.OK) {
      return true
    } else {
      throw new SyncError(`Header request to URL ${url} is failing`, response)
    }
  }

  public async removeGatewaySessions (
    userId: string,
    deviceId: string,
    userStatus: UserStatus
  ): Promise<boolean> {
    const { deviceSessions } = userStatus
    const sessionIDs = deviceSessions[deviceId]

    if (!sessionIDs || Object.values(sessionIDs).length === 0) {
      return false
    }

    const deletionResponses = await Promise.all(GATEWAY_BUCKETS.map(bucketKey => {
      const baseUrl = appDataAdminGatewayURI(bucketKey)
      const sessionId = sessionIDs[bucketKey]
      const options = {
        uri: `${baseUrl}/_user/${username(userId)}/_session/${sessionId}`,
        method: 'DELETE',
        json: true,
        simple: false,
        resolveWithFullResponse: true
      }
      try {
        const response = request(options)
        return response
      } catch (error) {
        throw new GatewayInaccessibleError(options.uri)
      }
    }))

    deletionResponses.forEach(response => {
      if ([HttpStatus.OK, HttpStatus.NOT_FOUND].indexOf(response.statusCode) < 0) {
        throw new SyncError(`Failed to delete SyncGateway session (${response.statusCode})`, response)
      }
    })

    delete deviceSessions[deviceId]

    await this.userStatusRepository.patchStatusWithUserId(userId, { deviceSessions }, {})

    // return `true` if all DELETE requests actually deleted something, `false` otherwise.
    return deletionResponses.every(response => response.statusCode === HttpStatus.OK)
  }

  public async gatewayAccountExists (userId: string, bucketKey: BucketKey): Promise<boolean> {
    const options = {
      method: 'GET',
      uri: `${appDataAdminGatewayURI(bucketKey)}/_user/${username(userId)}`,
      json: true,
      resolveWithFullResponse: true,
      simple: false
    }

    let response: any
    try {
      response = await request(options)
    } catch (error) {
      throw new GatewayInaccessibleError(options.uri)
    }
    if (response.statusCode === HttpStatus.OK) {
      return true
    } else if (response.statusCode === HttpStatus.NOT_FOUND) {
      return false
    } else {
      throw new SyncError(`Determining SyncGateway existence failed (${response.statusCode})`, response)
    }
  }

  // Creates a sync_gateway account
  public async createGatewayAccount (userId: string, bucketKey: BucketKey) {
    const sgUsername = username(userId)
    const options = {
      method: 'PUT',
      uri: `${appDataAdminGatewayURI(bucketKey)}/_user/${sgUsername}`,
      body: {
        password: await randomPassword(),
        admin_channels: [
          sgUsername,
          `${sgUsername}-readwrite`
        ],
        admin_roles: []
      },
      json: true,
      resolveWithFullResponse: true
    }

    let response: any
    try {
      response = await request(options)
    } catch (error) {
      throw new GatewayInaccessibleError(options.uri)
    }
    if (response.statusCode === HttpStatus.CREATED) {
      return sgUsername
    } else if (response.statusCode === HttpStatus.OK) {
      return sgUsername
    } else {
      throw new SyncError(`SyncGateway account upsert failed (${response.statusCode})`, response)
    }
  }

  // Creates a sync_gateway account
  public async createGatewayAdministrator (username: string, password: string, bucketKey: BucketKey, adminChannels: ReadonlyArray<string>, adminRoles: ReadonlyArray<string>) {
    const options = {
      method: 'PUT',
      uri: `${appDataAdminGatewayURI(bucketKey)}/_user/${username}`,
      body: {
        password: password,
        admin_channels: adminChannels,
        admin_roles: adminRoles
      },
      json: true,
      resolveWithFullResponse: true
    }
    let response: any
    try {
      response = await request(options)
    } catch (error) {
      throw new GatewayInaccessibleError(options.uri)
    }
    if (response.statusCode === HttpStatus.CREATED) {
      return
    } else if (response.statusCode === HttpStatus.OK) {
      return
    } else {
      throw new SyncError(`SyncGateway administrator account upsert failed (${response.statusCode})`, response)
    }
  }

  /**
   * removes a sync_gateway account.
   */
  public async removeGatewayAccount (userId: string) {
    await this.removeAllGatewaySessions(userId)

    const removeAccounts: request.RequestPromise[] = GATEWAY_BUCKETS.map((bucketKey) => {
      const uri = `${appDataAdminGatewayURI(bucketKey)}/_user/${username(userId)}`
      const options = {
        method: 'DELETE',
        uri: uri,
        json: true,
        resolveWithFullResponse: true,
        simple: false
      }
      let response: any
      try {
        response = request(options)
      } catch (error) {
        throw new GatewayInaccessibleError(options.uri)
      }
      return response
    })

    const responses = await Promise.all(removeAccounts)
    responses.forEach((response) => {
      if ([HttpStatus.OK, HttpStatus.NOT_FOUND].indexOf(response.statusCode) < 0) {
        throw new SyncError(`Failed to delete SyncGateway user (${response.url}: ${response.statusCode})`, response)
      }
    })
  }

  // Creates a session with a sync_gateway account
  // Removes existing sessions by default
  // TODO: rename this to make it clear it removes any existing session.
  public async createGatewaySessions (userId: string, deviceId: string, userStatus: UserStatus) {
    await this.removeGatewaySessions(userId, deviceId, userStatus)

    const sessionResponses = await Promise.all(
      GATEWAY_BUCKETS.map(async bucketKey => {
        const uri = `${appDataAdminGatewayURI(bucketKey)}/_session`
        const options = {
          method: 'POST',
          uri: uri,
          body: {
            name: username(userId)
          },
          json: true,
          simple: false,
          resolveWithFullResponse: true
        }

        let response: any
        try {
          response = await request(options)
        } catch (error) {
          throw new GatewayInaccessibleError(options.uri)
        }
        if (!response || !response.body || !response.body.session_id) {
          throw new SyncError(`Unable to parse session_id from response body (${JSON.stringify((response || {}).body)}`, response.body)
        }

        const sessionId = response.body.session_id as string

        return [bucketKey, sessionId] as [BucketKey, string]
      })
    )

    const { deviceSessions } = userStatus

    const sessionIds = sessionResponses
      .reduce((acc, [bucketKey, sessionId]) => {
        acc[bucketKey] = sessionId
        return acc
      }, {} as { [bucketKey in BucketKey]?: string })

    deviceSessions[deviceId] = sessionIds

    await this.userStatusRepository.patchStatusWithUserId(userId, { deviceSessions }, {})

    return deviceSessions[deviceId]
  }

  public async createGatewayContributor (user: User, bucketKey: BucketKey) {
    const uri = `${appDataAdminGatewayURI(bucketKey)}/`

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
        family: lastName
      },
      email: user.email,
      createdAt: date,
      updatedAt: date
    }

    const options = {
      method: 'POST',
      uri,
      body: userProfile,
      json: true,
      resolveWithFullResponse: true,
      simple: false
    }

    let response: any
    try {
      response = await request(options)
    } catch (error) {
      throw new GatewayInaccessibleError(options.uri)
    }
    if (
      response.statusCode === HttpStatus.OK ||
      response.statusCode === HttpStatus.CREATED
    ) {
      return
    } else {
      throw new SyncError(
      `SyncGateway contributor creation failed`,
      response.body
    )
    }
  }

  public async removeAllGatewaySessions (userId: string): Promise<boolean> {
    const removeSessions = GATEWAY_BUCKETS.map(bucketKey => {
      const uri = `${appDataAdminGatewayURI(bucketKey)}/_user/${username(userId)}/_session`
      const options = {
        method: 'DELETE',
        uri: uri,
        json: true,
        resolveWithFullResponse: true,
        simple: false
      }
      let response: any
      try {
        response = request(options)
      } catch (error) {
        throw new GatewayInaccessibleError(options.uri)
      }
      return response
    })

    const responses = await Promise.all(removeSessions)
    responses.forEach(response => {
      if ([HttpStatus.OK, HttpStatus.NOT_FOUND].indexOf(response.statusCode) < 0) {
        throw new SyncError(`Failed to delete SyncGateway sessions (${response.url}: ${response.statusCode})`, response)
      }
    })

    await this.userStatusRepository.patchStatusWithUserId(userId, { deviceSessions: {} }, {})

    // return `true` if all DELETE requests actually deleted something, `false` otherwise.
    return responses.every(response => response.statusCode === HttpStatus.OK)
  }
}
