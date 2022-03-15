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

import * as jsonwebtoken from 'jsonwebtoken'
import { compare, genSalt, hash } from 'bcrypt'
import checksum from 'checksum'
import { stringify } from 'qs'
import crypto from 'crypto'
import querystring from 'querystring'

import { IAuthService } from './IAuthService'
import { ISyncService } from '../Sync/ISyncService'
import { GATEWAY_BUCKETS } from '../Sync/SyncService'
import {
  User,
  Credentials,
  AuthorizedUser,
  GoogleAccessCredentials,
  UserToken,
  ResetPasswordCredentials,
  UserStatus,
  isBlocked,
  ChangePasswordCredentials,
  CreatedIAMDetails,
  ServerToServerAuthCredentials,
} from '../../Models/UserModels'
import { SingleUseTokenType } from '../../Models/SingleUseTokenModels'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { ISingleUseTokenRepository } from '../../DataAccess/Interfaces/ISingleUseTokenRepository'
import {
  InvalidCredentialsError,
  NoTokenError,
  MissingUserStatusError,
  UserBlockedError,
  UserNotVerifiedError,
  ValidationError,
  InvalidPasswordError,
  AccountNotFoundError,
  OperationDisabledError,
  DuplicateEmailError,
  InvalidBackchannelLogoutError,
  MissingUserRecordError,
} from '../../Errors'
import { IUserTokenRepository } from '../../DataAccess/Interfaces/IUserTokenRepository'
import {
  isLoginTokenPayload,
  generateLoginToken,
  LoginTokenPayload,
  getExpirationTime,
} from '../../Utilities/JWT/LoginTokenPayload'
import { UserActivityEventType } from '../../Models/UserEventModels'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import { UserActivityTrackingService } from '../UserActivity/UserActivityTrackingService'
import { config } from '../../Config/Config'
import { BucketKey } from '../../Config/ConfigurationTypes'
import { UserService } from '../User/UserService'
import { EmailService } from '../Email/EmailService'
import { IAMAuthTokenPayload } from '../../Utilities/JWT/IAMAuthTokenPayload'
import { IAMState } from '../../Auth/Interfaces/IAMState'
import { IInvitationService } from '../Invitation/IInvitationService'

import { log } from '../../Utilities/Logger'
import { IUserEmailRepository } from '../../DataAccess/Interfaces/IUserEmailRepository'
import { IAMStartData } from '../../Models/IAMModels'
import { IContainerInvitationService } from '../Invitation/IContainerInvitationService'
import { URL } from 'url'
import { IUserProfileRepository } from '../../DataAccess/Interfaces/IUserProfileRepository'
const cryptoRandomString = require('crypto-random-string')

/** Authentication token timeout */
const AUTH_TOKEN_TIMEOUT = () => getExpirationTime(14 * 24) // 14 days

/**
 * Authenticated token TTL in seconds.
 */
const RESET_PASSWORD_TOKEN_TIMEOUT = () => getExpirationTime(24)

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
    private userEmailRepository: IUserEmailRepository,
    private userProfileRepository: IUserProfileRepository,
    private emailService: EmailService,
    private singleUseTokenRepository: ISingleUseTokenRepository,
    private activityTrackingService: UserActivityTrackingService,
    private syncService: ISyncService,
    private userStatusRepository: IUserStatusRepository,
    private invitationService: IInvitationService,
    private containerInvitationService: IContainerInvitationService
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
    const jwtPayload = jsonwebtoken.decode(token)

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

    let isMatched = await compare(password, userStatus.password)

    if (!isMatched) {
      throw new InvalidPasswordError(user)
    }

    const userModel: User = {
      _id: user._id,
      name: user.name,
      email: user.email,
      ...(user.deleteAt && { deleteAt: user.deleteAt }),
    }

    const { userToken } = await this.createUserSessions(
      userModel,
      userStatus,
      appId,
      deviceId,
      {},
      {},
      false
    )

    return { token: userToken.token, user: userModel }
  }

  public async serverToServerAuth(
    credentials: ServerToServerAuthCredentials
  ): Promise<AuthorizedUser> {
    const { email, connectUserID, appId, deviceId } = credentials
    let user
    if (connectUserID) {
      user = await this.userRepository.getOne({ connectUserID })
    } else if (email) {
      user = await this.userRepository.getOne({
        email: AuthService.normalizeEmail(email),
      })
    }

    if (!user) {
      throw new AccountNotFoundError(connectUserID ? connectUserID : email)
    }

    return this.createUserSessionAndToken(user, appId, deviceId, true)
  }

  public async serverToServerTokenAuth(
    credentials: ServerToServerAuthCredentials
  ): Promise<AuthorizedUser> {
    const { connectUserID, appId, deviceId } = credentials
    let user = await this.userRepository.getOne({ connectUserID })

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
    const userStatus = await this.ensureValidUserStatus(user, appId, deviceId, isAdmin, verifyUser)

    const userModel: User = {
      _id: user._id,
      name: user.name,
      email: user.email,
    }

    const { userToken } = await this.createUserSessions(
      userModel,
      userStatus,
      appId,
      deviceId,
      {},
      {},
      false
    )

    return { user: userModel, token: userToken.token }
  }

  // let's polyfill in the user account creation for the derived data bucket
  // (user accounts in the derived data bucket were added after  some user data already existed –
  // this accomplishes lazily migrating pre-existing user data).
  public async ensureGatewayAccountExists(userId: string, bucketName: BucketKey): Promise<void> {
    if (!(await this.syncService.gatewayAccountExists(userId, bucketName))) {
      await this.syncService.createGatewayAccount(userId, bucketName)
    }
  }

  public async iamOAuthStartData(state: IAMState, action?: string): Promise<IAMStartData> {
    const apiUrl = AuthService.getAPIUrlBasedOnReferer(state.redirectBaseUri)
    const authCallbackURL = `${apiUrl}${config.IAM.authCallbackPath}`

    const nonce = AuthService.generateNonce()
    const hashedNonce = AuthService.hashNonce(nonce)

    const params = {
      scope: 'openid',
      response_type: 'id_token',
      client_id: `${config.IAM.clientID}`,
      state: AuthService.encodeIAMState(state),
      nonce: hashedNonce,
      redirect_uri: authCallbackURL,
      action,
    }

    return {
      url: `${config.IAM.authServerURL}/api/oauth/authorize?` + querystring.stringify(params),
      nonce,
    }
  }

  public static getAPIUrlBasedOnReferer(referer: string | null): string {
    if (referer) {
      const host = new URL(referer).host
      const refererMainDomain = host.substring(host.indexOf('.'))
      for (const serverUrl of config.IAM.apiServerURL) {
        const serverMainDomain = new URL(serverUrl).host
        if (serverMainDomain.substring(serverMainDomain.indexOf('.')) === refererMainDomain) {
          return serverUrl
        }
      }
    }
    return config.IAM.apiServerURL[0]
  }

  /**
   * Converts {@link IAMState} to a ':' separated 'key=value' string and base64 encodes it.
   * @param state IAMState to be encoded
   */
  public static encodeIAMState(state: IAMState): string {
    let stateParam = ''
    const separator = ';'
    Object.keys(state).forEach((key) => {
      if (state[key]) {
        // If some value was added before, add a separator
        if (stateParam.length !== 0) {
          stateParam += separator
        }
        stateParam += key + '=' + state[key]
      }
    })
    return Buffer.from(stateParam).toString('base64')
  }

  // Create a cryptographically secure nonce
  private static generateNonce(): string {
    return cryptoRandomString(10)
  }

  public static hashNonce(nonce: string): string {
    return crypto.createHash('sha1').update(nonce).digest('hex')
  }

  public iamOAuthErrorURL(errorDescription: string, serverUrl: string): string {
    // return back to web application with the error message, if there was an error in OAuth response
    return `${serverUrl}/login#${stringify({
      error: 'error',
      error_description: errorDescription,
    })}`
  }

  public userEmailID(email: string) {
    return checksum(email, { algorithm: 'sha1' })
  }

  /**
   * Validate user's google access info and create new user object if user doesn't exists.
   */
  public async loginGoogle(googleAccess: GoogleAccessCredentials): Promise<AuthorizedUser> {
    AuthService.ensureNonConnectAuthEnabled()

    const email = AuthService.normalizeEmail(googleAccess.email)
    const { appId, deviceId, name, invitationId, accessToken } = googleAccess

    let user = await this.userRepository.getOne({ email })

    let userStatus: UserStatus | null = null

    if (!user) {
      const userEmailID = this.userEmailID(email)
      try {
        await this.userEmailRepository.create({ _id: userEmailID }, {})
      } catch (error) {
        throw new DuplicateEmailError(email)
      }

      const u = await this.userRepository.create({ name, email }, {})

      user = u

      await Promise.all(
        GATEWAY_BUCKETS.map((key) => this.syncService.createGatewayAccount(u._id, key))
      )
      await this.syncService.createGatewayContributor(u, BucketKey.Data)

      userStatus = await this.userStatusRepository.create(
        {
          _id: u._id,
          blockUntil: null,
          isVerified: true,
          createdAt: new Date(),
          deviceSessions: {},
          password: '',
        },
        {}
      )

      // tslint:disable-next-line: no-floating-promises
      this.activityTrackingService.createEvent(
        u._id,
        UserActivityEventType.Registration,
        appId,
        deviceId
      )
    } else {
      userStatus = await this.userStatusRepository.statusForUserId(user._id)
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

    const credentials = {
      google: {
        accessToken,
        refreshToken: '', // The Google OAuth strategy incorrectly requires a refresh token, hence empty string passed in.
      },
    }

    const { userToken } = await this.createUserSessions(
      user,
      userStatus,
      googleAccess.appId,
      googleAccess.deviceId,
      {},
      credentials,
      false
    )

    if (invitationId) {
      await this.invitationService.accept(invitationId, null, null)
    }

    return { token: userToken.token, user: user }
  }

  public decodeIAMState(stateParam: string): IAMState {
    let state: { [s: string]: string } = {}
    Buffer.from(stateParam, 'base64')
      .toString('ascii')
      .split(';')
      .map((stateParamValue: string) => {
        const params = stateParamValue.split('=')
        state[params[0]] = params[1]
      })
    const { deviceId, redirectUri, theme, redirectBaseUri } = state
    return {
      deviceId,
      redirectUri,
      theme,
      redirectBaseUri,
    }
  }

  /**
   * Signs in the user if user already exist in the system, or else creates
   * a new user and logs in the user.
   * @returns {Promise<AuthorizedUser>}
   */
  public async iamOAuthCallback(
    iamOauthToken: IAMAuthTokenPayload,
    state: IAMState
  ): Promise<AuthorizedUser> {
    const { aud: appID, sub: connectUserID, email, sid: iamSessionID } = iamOauthToken

    if (!email) {
      throw new InvalidCredentialsError('Missing email scope in IAM token')
    }

    const { deviceId } = state
    if (!deviceId) {
      throw new ValidationError('Missing Device ID in IAM state parameter', state)
    }

    let user = await this.userRepository.getOne({
      connectUserID,
    })

    log.debug(`Get user: ${user}`)

    if (!user) {
      user = await this.userRepository.getOne({ email })
      await this.patchConnectUserID(user, connectUserID)
    }

    let userStatus: UserStatus
    if (!user) {
      log.debug('Create User and userStatus')

      const { user: createdUser, userStatus: createdUserStatus } =
        await this.createUserForIAMDetails(iamOauthToken, deviceId)

      log.debug(`User and userStatus created: ${createdUser} & ${createdUserStatus}`)

      user = createdUser
      userStatus = createdUserStatus

      await this.invitationService.updateInvitedUserID(
        createdUser._id.replace('|', '_'),
        createdUser.email
      )
      await this.containerInvitationService.updateInvitedUserID(
        createdUser._id.replace('|', '_'),
        createdUser.email
      )
    } else {
      const foundUserStatus = await this.userStatusRepository.statusForUserId(user._id)

      log.debug(`Get found userStatus: ${foundUserStatus}`)

      if (!foundUserStatus) {
        userStatus = await this.userStatusRepository.create(
          {
            _id: user._id,
            blockUntil: null,
            isVerified: true,
            createdAt: new Date(),
            deviceSessions: {},
            password: '',
          },
          {}
        )
      } else {
        userStatus = foundUserStatus
      }
    }

    if (!userStatus) {
      // tslint:disable-next-line: no-floating-promises
      this.activityTrackingService.createEvent(
        user._id,
        UserActivityEventType.StatusNotFound,
        appID,
        deviceId
      )
      throw new MissingUserStatusError(user._id)
    }

    const { userToken } = await this.createUserSessions(
      user,
      userStatus,
      appID,
      deviceId,
      { iamSessionID },
      {},
      true
    )

    return { token: userToken.token, user }
  }

  private async patchConnectUserID(user: User | null, connectUserID: string) {
    if (user) {
      if (user.connectUserID) {
        throw new InvalidCredentialsError('User with this email has a mismatching Connect ID')
      }

      await this.userRepository.patch(user._id, { connectUserID }, {})
      user.connectUserID = connectUserID
    }
  }

  /**
   * Sends email to reset password.
   */
  public async sendPasswordResetInstructions(email: string): Promise<void> {
    const normalizedEmail = AuthService.normalizeEmail(email)
    const user = await this.userRepository.getOne({ email: normalizedEmail })
    if (!user) {
      throw new InvalidCredentialsError(`No user with email address '${email}'`)
    }
    const userStatus = await this.userStatusRepository.statusForUserId(user._id)
    if (!userStatus) {
      // tslint:disable-next-line: no-floating-promises
      this.activityTrackingService.createEvent(
        user._id,
        UserActivityEventType.StatusNotFound,
        null,
        null
      )
      throw new MissingUserStatusError(user._id)
    }

    const tokenId = await this.singleUseTokenRepository.ensureTokenExists(
      user,
      SingleUseTokenType.ResetPasswordToken,
      RESET_PASSWORD_TOKEN_TIMEOUT()
    )
    await this.emailService.sendPasswordResetInstructions(user, userStatus, tokenId)

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      user._id,
      UserActivityEventType.SendPasswordResetEmail,
      null,
      null
    )
  }

  /**
   * Reset user's password, given a password reset token, userId and a new password and log the user in.
   */
  public async resetPassword(credentials: ResetPasswordCredentials): Promise<AuthorizedUser> {
    if (!credentials) {
      throw new InvalidCredentialsError('Invalid reset password credentials')
    }

    const { tokenId, newPassword, deviceId, appId } = credentials

    const resetToken = await this.singleUseTokenRepository.getById(tokenId)

    if (!resetToken) {
      throw new NoTokenError(tokenId)
    }

    const user = await this.userRepository.getById(resetToken.userId)
    if (!user) {
      throw new MissingUserRecordError(resetToken.userId)
    }

    const userStatus = await this.userStatusRepository.patchStatusWithUserId(
      user._id,
      {
        deviceSessions: {},
        password: await AuthService.createPassword(newPassword),
      },
      {}
    )

    // Token is valid unless update succeeds.
    await this.singleUseTokenRepository.remove({ _id: tokenId })
    //await this.syncService.removeAllGatewaySessions(resetToken.userId)
    // remove all login (JWT) tokens
    await this.userTokenRepository.remove({ userId: resetToken.userId })

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      resetToken.userId,
      UserActivityEventType.ResetPassword,
      null,
      null
    )

    const userModel: User = {
      _id: resetToken.userId,
      name: user.name,
      email: user.email,
    }

    const { userToken } = await this.createUserSessions(
      userModel,
      userStatus,
      appId,
      deviceId,
      {},
      {},
      false
    )

    return { token: userToken.token, user: userModel }
  }

  /**
   * Check the existence of the token and remove it if it exists.
   * @param token User's token.
   */
  public async logout(token: string): Promise<void> {
    const payload = jsonwebtoken.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload')
    }

    const id = this.userTokenRepository.fullyQualifiedId(payload.tokenId)

    const userToken = await this.userTokenRepository.getById(id)

    if (!userToken) {
      throw new NoTokenError(id)
    }

    const criteria = {
      userId: userToken.userId,
      deviceId: userToken.deviceId,
      appId: userToken.appId,
    }

    await this.userTokenRepository.remove(criteria)

    const userStatus = await this.userStatusRepository.statusForUserId(userToken.userId)

    if (userStatus === null) {
      throw new MissingUserStatusError(userToken.userId)
    }

    //await this.syncService.removeGatewaySessions(userToken.userId, userToken.deviceId, userStatus)

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      userToken.userId,
      UserActivityEventType.Logout,
      null,
      null
    )
  }

  public async backchannelLogout(iamSessionID: string) {
    const userToken = await this.userTokenRepository.getOne({ iamSessionID })

    if (!userToken) {
      throw new InvalidBackchannelLogoutError('Invalid IAM session id', iamSessionID)
    }

    const { _id: tokenID, userId } = userToken

    const userStatus = await this.userStatusRepository.statusForUserId(userId)

    if (userStatus === null) {
      throw new InvalidBackchannelLogoutError('Unable to retrieve UserStatus for user', userId)
    }

    await this.userTokenRepository.remove({ _id: tokenID })
    //await this.syncService.removeGatewaySessions(userId, deviceId, userStatus)

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(userId, UserActivityEventType.Logout, null, null)
  }

  public async changePassword(credentials: ChangePasswordCredentials): Promise<void> {
    const user = await this.userRepository.getById(credentials.userId)

    if (!user) {
      throw new InvalidCredentialsError(`User not found`)
    }
    const userStatus = await this.userStatusRepository.statusForUserId(user._id)

    if (!userStatus) {
      throw new MissingUserStatusError(user._id)
    }

    const matchedPassword: boolean = await compare(credentials.currentPassword, userStatus.password)

    if (!matchedPassword) {
      throw new InvalidPasswordError(user)
    }

    await this.userStatusRepository.patchStatusWithUserId(
      user._id,
      {
        password: await AuthService.createPassword(credentials.newPassword),
      },
      {}
    )

    const deviceIds = Object.keys(userStatus.deviceSessions).filter(
      (x) => x !== credentials.deviceId
    )
    for (const deviceId of deviceIds) {
      await this.userTokenRepository.remove({ userId: user._id, deviceId: deviceId })
    }
    //for (const deviceId of deviceIds) {
    //  await this.syncService.removeGatewaySessions(user._id, deviceId, userStatus)
    //}
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
      userStatus = await this.userStatusRepository.create(
        {
          _id: user._id,
          blockUntil: null,
          isVerified: true,
          createdAt: new Date(),
          deviceSessions: {},
          password: '',
        },
        {}
      )
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
      await this.userStatusRepository.patch(userStatus._id, { blockUntil: null }, {})
    }

    if (!isAdmin && !userStatus.isVerified) {
      throw new UserNotVerifiedError(user, userStatus)
    }

    return userStatus
  }

  private async createUserSessions(
    user: User,
    _userStatus: UserStatus,
    appId: string,
    deviceId: string,
    iamCredentials: { iamSessionID?: string },
    googleCredentials: any,
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
      googleCredentials,
      iamCredentials.iamSessionID
    )

    await this.ensureGatewayAccountExists(userToken.userId, BucketKey.Data)
    await this.ensureGatewayAccountExists(userToken.userId, BucketKey.DerivedData)

    /*const syncSessions = await this.syncService.createGatewaySessions(
      userToken.userId,
      userToken.deviceId,
      userStatus
    )*/

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
    credentials?: any,
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

      let token = generateLoginToken(
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
        credentials,
      }

      await this.userTokenRepository.create(userToken, {})
    }

    if (userToken.hasExpiry) {
      await this.userTokenRepository.touch(userToken._id, AUTH_TOKEN_TIMEOUT())
    }

    return userToken
  }

  private async ensureUserProfileExists(user: User) {
    const userProfile = await this.userProfileRepository.getById(UserService.profileID(user._id))

    if (!userProfile) {
      await this.syncService.createGatewayContributor(user, BucketKey.Data)
    }
  }

  private async createUserForIAMDetails(
    iamOauthToken: IAMAuthTokenPayload,
    deviceID: string | null
  ): Promise<CreatedIAMDetails> {
    const { name, aud: appID, sub: connectUserID } = iamOauthToken
    const email = AuthService.normalizeEmail(iamOauthToken.email)

    try {
      const userEmailID = this.userEmailID(email)
      await this.userEmailRepository.create({ _id: userEmailID }, {})
    } catch (error) {
      throw new DuplicateEmailError(email)
    }

    let user: User
    try {
      // create a new user when user is not found in DB
      user = await this.userRepository.create(
        {
          _id: checksum(connectUserID, { algorithm: 'sha1' }),
          name: name || '',
          email,
          connectUserID,
        },
        {}
      )
      log.debug(`User created: ${user}`)
    } catch (error) {
      const userEmailID = this.userEmailID(email)
      await this.userEmailRepository.remove({ _id: `UserEmail|${userEmailID}` })
      log.error('An error occurred while creating user', error)
      throw error
    }

    const userID = user._id

    await Promise.all(
      GATEWAY_BUCKETS.map((key) => this.syncService.createGatewayAccount(userID, key))
    )

    log.debug('Gateway account created.')
    await this.syncService.createGatewayContributor(user, BucketKey.Data)
    log.debug('Gateway contributor created.')

    let userStatus: UserStatus
    try {
      userStatus = await this.userStatusRepository.create(
        {
          _id: userID,
          blockUntil: null,
          isVerified: true,
          createdAt: new Date(),
          deviceSessions: {},
          password: '',
        },
        {}
      )
      log.debug(`User status created: ${userStatus}`)
    } catch (error) {
      log.error('An error occurred while creating user status', error)
      throw error
    }

    // TODO: review if "aud" is the correct value that should be passed.
    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      userID,
      UserActivityEventType.Registration,
      appID,
      deviceID
    )

    return { user, userStatus }
  }
}
