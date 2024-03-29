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

import moment from 'moment'

import { BucketKey } from '../Config/ConfigurationTypes'
import { ContainerRole } from './ContainerModels'

/**
 * Represents user's login credentials.
 */
export interface Credentials {
  /**
   * User's email.
   */
  email: string

  /**
   * User's plain password.
   */
  password?: string

  /**
   * Device id.
   */
  deviceId: string

  /**
   * Application id.
   */
  appId: string
}

export interface ServerToServerAuthCredentials {
  /**
   * Connect's user id.
   */
  connectUserID?: string

  /**
   * User's email.
   */
  email?: string

  /**
   * Device id.
   */
  deviceId: string

  /**
   * Application id.
   */
  appId: string
}

/**
 * Represents an user entity.
 */
export interface User {
  /**
   * User's unique id.
   */
  _id: string
  /**
   * User's name.
   */
  name: string
  /**
   * User's email.
   */
  email: string
  /**
   * Connect's user id that is stored in the sub field of connect token.
   */
  connectUserID?: string
  /**
   * timestamp represents the time when the user going to be deleted.
   */
  deleteAt?: number
}

export function userForRow(userRowData: UserRow): User {
  return {
    _id: (userRowData.id || userRowData._id) as string,
    name: userRowData.name,
    email: userRowData.email,
    connectUserID: userRowData.connectUserID,
    ...(userRowData.deleteAt && { deleteAt: userRowData.deleteAt }),
  }
}

/**
 * Represents an user entity and auth.
 */
export interface AuthorizedUser {
  /**
   * User's auth token.
   */
  token: string

  /**
   * User model.
   */
  user: User

  /**
   * Session cookie for Sync Gateway
   */
  // syncSessions: BucketSessions
}

/**
 * Represents all possible fields for new user object.
 */
export interface UserRow {
  /**
   * User's unique id.
   */
  id: string
  /**
   * User's name.
   */
  name: string
  /**
   * User's unique email address.
   */
  email: string
  /**
   * Connect's user id that is stored in the sub field of connect token.
   */
  connectUserID?: string
  /**
   * timestamp represents the time when the user going to be deleted.
   */
  deleteAt?: number
  /**
   * User's unique id as _id.
   */
  _id?: string
}
/**
 * Represents all possible fields for new user object.
 */
export interface SignupCredentials {
  /**
   * User's full name.
   */
  name: string
  /**
   * User's unique email address.
   */
  email: string
  /**
   * User's hashed password.
   */
  password?: string
  /**
   * A token signed by a trusted source
   */
  token?: string
  /**
   * A token signed by a trusted source
   */
  connectUserID?: string
}

export interface ConnectSignupCredentials {
  /**
   * User's full name.
   */
  name: string
  /**
   * User's unique email address.
   */
  email: string
  /**
   * A token signed by a trusted source
   */
  connectUserID: string
}

/**
 * Represents all possible fields for new user object.
 */
export interface INewUser {
  /**
   * User's unique id, if not set then db will generate new one.
   */
  _id?: string

  /**
   * User's full name.
   */
  name: string | null
  /**
   * User's unique email address.
   */
  email: string
  /**
   * Connect's user id that is stored in the sub field of connect token.
   */
  connectUserID?: string
}

/**
 * Represents all possible fields for updating already exists user object.
 */
export interface IUpdateUser {
  /**
   * User's unique id, if not set then db will generate new one.
   */
  _id: string
  /**
   * The type of the document.
   */
  _type: string
  /**
   * User's full name.
   */
  name: string
  /**
   * User's unique email address.
   */
  email: string
  /**
   * User's hashed password.
   */
  password: string
  /**
   * Determine whether the user has verified his email or not.
   */
  isVerified: boolean
  /**
   * User creation date timestamp.
   */
  creationTimestamp: number
  /**
   * Connect's user id that is stored in the sub field of connect token.
   */
  connectUserID: string
  /**
   * timestamp represents the time when the user going to be deleted.
   */
  deleteAt?: number
}

/**
 * Represents all possible fields for new user object.
 */
export interface UserToken {
  /**
   * User's id.
   */
  userId: string
  /**
   * True if the user has an expiry time, false otherwise.
   */
  hasExpiry: boolean
  /**
   * User's related JWT token
   */
  token: string
  /**
   * Device's unique id.
   */
  deviceId: string
  /**
   * Application's id.
   */
  appId: string
}

export interface UserEmail {
  /**
   * User's unique id, which represent the email.
   */
  _id: string
}

export interface InvitationToken {
  /**
   * Token's unique id.
   */
  _id: string
  /**
   * Container id.
   */
  containerID: string
  /**
   * Invited user invitation role.
   */
  permittedRole: ContainerRole
  /**
   * Container related JWT token
   */
  token: string
  expiry: number
}

export interface UpdateInvitationToken {
  _id?: string
}

export type BucketSessions = {
  [bucketKey in BucketKey]?: string
}

export type DeviceSessions = {
  [deviceId: string]: BucketSessions
}

export interface UserStatus {
  _id: string
  password: string
  isVerified: boolean
  blockUntil: Date | null
  /**
   * Object mapping the users deviceIds to the corresponding gateway sessionId
   */
  deviceSessions: DeviceSessions
  createdAt: Date
}

export function isBlocked(userStatus: UserStatus, date: Date): boolean {
  return userStatus.blockUntil !== null && moment(date).diff(userStatus.blockUntil) <= 0
}

export interface UpdateUserStatus {
  deviceSessions?: DeviceSessions
  _id?: string
  password?: string
  isVerified?: boolean
  blockUntil?: Date | null
  createdAt?: Date
}
