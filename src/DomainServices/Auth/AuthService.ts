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

import { compare, genSalt, hash } from 'bcrypt'
import checksum from 'checksum'
import jwt from 'jsonwebtoken'

import { config } from '../../Config/Config'
import { IUserProfileRepository } from '../../DataAccess/Interfaces/IUserProfileRepository'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import { IUserTokenRepository } from '../../DataAccess/Interfaces/IUserTokenRepository'
import {
  AccountNotFoundError,
  InvalidCredentialsError,
  InvalidPasswordError,
  MissingUserStatusError,
  OperationDisabledError,
  UserBlockedError,
  UserNotVerifiedError,
  ValidationError,
} from '../../Errors'
import { UserActivityEventType } from '../../Models/UserEventModels'
import {
  AuthorizedUser,
  Credentials,
  isBlocked,
  ServerToServerAuthCredentials,
  User,
  UserStatus,
  UserToken,
} from '../../Models/UserModels'
import {
  generateLoginToken,
  getExpirationTime,
  isLoginTokenPayload,
  LoginTokenPayload,
} from '../../Utilities/JWT/LoginTokenPayload'
import { ISyncService } from '../Sync/ISyncService'
import { UserService } from '../User/UserService'
import { UserActivityTrackingService } from '../UserActivity/UserActivityTrackingService'
import { IAuthService } from './IAuthService'

/** Authentication token timeout */
const AUTH_TOKEN_TIMEOUT = () => getExpirationTime(14 * 24) // 14 days

/**
 * The max number of login attempts before user account becomes blocked.
 */
export const MAX_NUMBER_OF_LOGIN_ATTEMPTS = 5

type BearerHeaderValue = string

/**
 * Manages all authentications operations.
 */
export class AuthService implements IAuthService {
  constructor(
    private userRepository: IUserRepository,
    private userTokenRepository: IUserTokenRepository,
    private userProfileRepository: IUserProfileRepository,
    private activityTrackingService: UserActivityTrackingService,
    private syncService: ISyncService,
    private userStatusRepository: IUserStatusRepository
  ) {}

  static isBearerHeaderValue(value: string | string[] | undefined): value is BearerHeaderValue {
    return typeof value === 'string' && value.startsWith('Bearer ')
  }

  static normalizeEmail(email: string) {
    return email.toLowerCase()
  }

  public static ensureNonConnectAuthEnabled() {
    if (process.env.NODE_ENV !== 'test' && !config.auth.enableNonConnectAuth) {
      throw new OperationDisabledError('Only Connect based authentication is enabled.')
    }
  }

  public static ensureValidAuthorizationBearer(authorizationHeader: any): LoginTokenPayload {
    if (!AuthService.isBearerHeaderValue(authorizationHeader)) {
      throw new ValidationError(
        'Authorization header does not contain a bearer token',
        authorizationHeader
      )
    }

    const token = authorizationHeader.replace('Bearer ', '')
    const jwtPayload = jwt.decode(token)

    if (!isLoginTokenPayload(jwtPayload)) {
      throw new InvalidCredentialsError('Invalid authenticated user payload object')
    }

    return jwtPayload
  }

  public static async createPassword(password: string) {
    const salt = await genSalt(config.auth.hashSaltRounds)

    return hash(password, salt)
  }

  public async login(credentials: Credentials): Promise<AuthorizedUser> {
    AuthService.ensureNonConnectAuthEnabled()
    const email = AuthService.normalizeEmail(credentials.email)
    const { appId, password, deviceId } = credentials

    const user = await this.userRepository.getOne({ email })

    if (!user) {
      throw new AccountNotFoundError(email)
    }

    const userStatus = await this.ensureValidUserStatus(user, appId, deviceId, false)

    const isMatched = password && (await compare(password, userStatus.password))

    if (!isMatched) {
      throw new InvalidPasswordError(user)
    }

    const userModel: User = {
      _id: user._id,
      name: user.name,
      email: user.email,
      ...(user.deleteAt && { deleteAt: user.deleteAt }),
    }

    const { userToken } = await this.createUserSessions(userModel, appId, deviceId, {}, false)

    return { token: userToken.token, user: userModel }
  }

  public async serverToServerTokenAuth(
    credentials: ServerToServerAuthCredentials
  ): Promise<AuthorizedUser> {
    const { connectUserID, appId, deviceId } = credentials
    const user = await this.userRepository.getOne({ connectUserID })

    if (!user) {
      throw new AccountNotFoundError(connectUserID)
    }

    return this.createUserSessionAndToken(user, appId, deviceId, false, true)
  }

  private async createUserSessionAndToken(
    user: User,
    appId: string,
    deviceId: string,
    isAdmin: boolean,
    verifyUser?: boolean | false
  ) {
    await this.ensureValidUserStatus(user, appId, deviceId, isAdmin, verifyUser)

    const userModel: User = {
      _id: user._id,
      name: user.name,
      email: user.email,
    }

    const { userToken } = await this.createUserSessions(userModel, appId, deviceId, {}, false)

    return { user: userModel, token: userToken.token }
  }

  public async ensureUserStatusExists(userId: string): Promise<void> {
    await this.syncService.getOrCreateUserStatus(userId)
  }

  public userEmailID(email: string) {
    return checksum(email, { algorithm: 'sha1' })
  }

  private async ensureValidUserStatus(
    user: User,
    appId: string,
    deviceId: string,
    isAdmin: boolean,
    verifyUser?: boolean | false
  ): Promise<UserStatus> {
    let userStatus = await this.userStatusRepository.statusForUserId(user._id)

    if (!userStatus && verifyUser) {
      userStatus = await this.userStatusRepository.create({
        _id: user._id,
        blockUntil: null,
        isVerified: true,
        createdAt: new Date(),
        deviceSessions: {},
        password: '',
      })
    }

    if (!userStatus) {
      // tslint:disable-next-line: no-floating-promises
      this.activityTrackingService.createEvent(
        user._id,
        UserActivityEventType.StatusNotFound,
        appId,
        deviceId
      )
      throw new MissingUserStatusError(user._id)
    }

    if (isBlocked(userStatus, new Date())) {
      throw new UserBlockedError(user, userStatus)
    } else if (userStatus.blockUntil !== null) {
      await this.userStatusRepository.patch(userStatus._id, { blockUntil: null })
    }

    if (!isAdmin && !userStatus.isVerified) {
      throw new UserNotVerifiedError(user, userStatus)
    }

    return userStatus
  }

  private async createUserSessions(
    user: User,
    appId: string,
    deviceId: string,
    iamCredentials: { iamSessionID?: string },
    hasExpiry: boolean
  ) {
    await this.ensureUserProfileExists(user)
    const userToken = await this.ensureUserTokenExists(
      user._id,
      user.connectUserID,
      appId,
      deviceId,
      hasExpiry,
      user.email,
      iamCredentials.iamSessionID
    )

    await this.ensureUserStatusExists(userToken.userId)

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      user._id,
      UserActivityEventType.SuccessfulLogin,
      appId,
      deviceId
    )

    return { userToken }
  }

  private async ensureUserTokenExists(
    userId: string,
    connectUserID: string | undefined,
    appId: string,
    deviceId: string,
    hasExpiry: boolean,
    email?: string,
    iamSessionID?: string
  ): Promise<UserToken> {
    const criteria = {
      userId,
      deviceId,
      appId,
    }

    let userToken = await this.userTokenRepository.getOne(criteria)

    if (!userToken) {
      let expiryTime: number | null = null
      const tokenId = checksum(`${userId}-${deviceId}-${appId}`, {
        algorithm: 'sha1',
      })

      if (hasExpiry) {
        expiryTime = AUTH_TOKEN_TIMEOUT()
      }

      const token = generateLoginToken(
        {
          tokenId,
          userId,
          connectUserID,
          userProfileId: UserService.profileID(userId),
          appId,
          iamSessionID,
          email,
        },
        expiryTime
      )

      userToken = {
        _id: tokenId,
        userId,
        hasExpiry,
        deviceId,
        appId,
        token,
        iamSessionID,
      }

      await this.userTokenRepository.create(userToken)
    }

    if (userToken.hasExpiry) {
      await this.userTokenRepository.touch(userToken._id, AUTH_TOKEN_TIMEOUT())
    }

    return userToken
  }

  private async ensureUserProfileExists(user: User) {
    // call it without userId intentionally
    const userProfile = await this.userProfileRepository.getById(UserService.profileID(user._id))

    if (!userProfile) {
      await this.syncService.createUserProfile(user)
    }
  }
}
