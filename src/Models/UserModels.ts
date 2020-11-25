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

import { UserActivityEventType } from './UserEventModels'
import { BucketKey } from '../Config/ConfigurationTypes'
import { ContainerRole } from './ContainerModels'
import { ValidationError } from '../Errors'

export type IdentifiableUser = { _id: string, email?: string }

export function isIdentifiableUser (user?: any): user is IdentifiableUser {
  return typeof user !== 'undefined' && typeof user._id === 'string'
}

export function ensureValidUser (user?: any): IdentifiableUser {
  if (!isIdentifiableUser(user)) {
    throw new ValidationError('User undefined or lacks id', user)
  }
  return user
}

/**
 * Represents user's reset password credentials.
 */
export interface ResetPasswordCredentials {
  /**
   * The single use reset password.
   */
  tokenId: string
  /**
   * User's new password.
   */
  newPassword: string
  /**
   * Device id.
   */
  deviceId: string
  /**
   * Application id.
   */
  appId: string
}

export interface ChangePasswordCredentials {
  /**
   * User's Id.
   */
  userId: string
  /**
   * User's current password.
   */
  currentPassword: string
  /**
   * User's new password.
   */
  newPassword: string
  /**
   * Device id.
   */
  deviceId: string
}

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
 * Represents credentials for Google login access.
 */
export interface GoogleAccessCredentials {
  /**
   * User's full name.
   */
  name: string
  /**
   * User's email.
   */
  email: string
  /**
   * Device's ID.
   */
  deviceId: string
  /**
   * Application's Id.
   */
  appId: string

  /** An optional invitation to which the account creation is a response to. */
  invitationId: string | null
  /**
   * Google Access Token.
   */
  accessToken: string
  /**
   * Google Refresh Token.
   */
  refreshToken: string
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

export function userForRow (userRowData: UserRow): User {
  return {
    _id: userRowData._id,
    name: userRowData.name,
    email: userRowData.email,
    connectUserID: userRowData.connectUserID,
    ...userRowData.deleteAt && { deleteAt : userRowData.deleteAt }
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
  syncSessions: BucketSessions
}

/**
 * Represents all possible fields for new user object.
 */
export interface UserRow {
  /**
   * User's unique id.
   */
  _id: string
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
   * Token's unique id.
   */
  _id: string
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

  /**
   * IAM session id.
   */
  iamSessionID?: string

  credentials?: { google: { accessToken: string , refreshToken: string } }
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

export function isBlocked (userStatus: UserStatus, date: Date): boolean {
  return userStatus.blockUntil !== null && moment(date).diff(userStatus.blockUntil) <= 0 ? true : false
}

export interface UpdateUserStatus {
  deviceSessions?: DeviceSessions
  _id?: string
  password?: string
  isVerified?: boolean
  blockUntil?: Date | null
  createdAt?: Date
}

export interface UserStatusViewFunctionDocument {
  _type: string
  eventType: UserActivityEventType
  userId: string
  timestamp: number
}

export interface CreatedIAMDetails {
  user: User
  userStatus: UserStatus
}
