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

import { Request } from 'express'
import * as jsonwebtoken from 'jsonwebtoken'

import { isString, isNumber } from '../../../util'
import { IAuthController } from './IAuthController'
import { BaseController, isBearerHeaderValue, authorizationBearerToken } from '../../BaseController'
import {
  ValidationError,
  InvalidClientApplicationError,
  MissingQueryParameterError,
  InvalidCredentialsError,
  InvalidServerCredentialsError,
  InvalidBackchannelLogoutError,
} from '../../../Errors'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { AuthorizedUser, BucketSessions } from '../../../Models/UserModels'
import { isIAMOAuthTokenPayload } from '../../../Utilities/JWT/IAMAuthTokenPayload'
import { IAMState } from '../../../Auth/Interfaces/IAMState'
import { isIAMLogoutTokenPayload } from '../../../Utilities/JWT/IAMLogoutTokenPayload'
import { AdminTokenPayload, isAdminTokenPayload } from '../../../Utilities/JWT/AdminTokenPayload'
import { ContainerService } from '../../../DomainServices/Container/ContainerService'
import { config } from '../../../Config/Config'

/**
 * The app-id header key.
 */
export const APP_ID_HEADER_KEY = 'manuscripts-app-id'

/**
 * The app-secret header key.
 */
export const APP_SECRET_HEADER_KEY = 'manuscripts-app-secret'

export class AuthController extends BaseController implements IAuthController {
  /**
   * Logs user into the system.
   */
  async login(req: Request): Promise<AuthorizedUser> {
    const appId = req.headers[APP_ID_HEADER_KEY]

    if (!isString(appId)) {
      throw new InvalidClientApplicationError(appId)
    }

    if (!(isString(req.body.email) && req.body.email.length)) {
      throw new ValidationError('email should be non-empty string', req.body)
    }

    if (req.headers.authorization) {
      return DIContainer.sharedContainer.authService.login({
        appId,
        email: req.body.email.toLowerCase(),
        deviceId: req.body.deviceId,
      })
    }

    if (!(isString(req.body.password) && req.body.password.length)) {
      throw new ValidationError('password should be non-empty string', req.body)
    }

    return DIContainer.sharedContainer.authService.login({
      appId,
      email: req.body.email.toLowerCase(),
      password: req.body.password,
      deviceId: req.body.deviceId,
    })
  }

  async serverToServerAuth(req: Request): Promise<AuthorizedUser> {
    const token = authorizationBearerToken(req)

    const appId = req.headers[APP_ID_HEADER_KEY]

    if (!isString(appId)) {
      throw new InvalidClientApplicationError(appId)
    }

    const deviceId = req.body.deviceId

    if (!isString(deviceId)) {
      throw new InvalidCredentialsError('Device id must be string.')
    }

    const tokenPayload = jsonwebtoken.decode(token) as AdminTokenPayload
    if (!isAdminTokenPayload(tokenPayload)) {
      throw new InvalidServerCredentialsError('Admin token missing email and connectUserID.')
    }

    return DIContainer.sharedContainer.authService.serverToServerAuth({
      connectUserID: tokenPayload.connectUserID,
      email: tokenPayload.email,
      deviceId,
      appId,
    })
  }

  async serverToServerTokenAuth(req: Request): Promise<AuthorizedUser> {
    const appId = req.headers[APP_ID_HEADER_KEY]

    if (!isString(appId)) {
      throw new InvalidClientApplicationError(appId)
    }

    const { deviceId } = req.body
    const { connectUserID } = req.params

    if (!isString(deviceId)) {
      throw new InvalidCredentialsError('Device id must be string.')
    }

    if (!isString(connectUserID)) {
      throw new InvalidCredentialsError('connectUserID must be string.')
    }
    return DIContainer.sharedContainer.authService.serverToServerTokenAuth({
      connectUserID: connectUserID,
      deviceId,
      appId,
    })
  }

  async iamOAuthCallback(req: Request, state: IAMState): Promise<AuthorizedUser> {
    const token = req.query.id_token
    if (!isString(token)) {
      return Promise.reject(new MissingQueryParameterError('id_token'))
    }

    if (!state) {
      throw new MissingQueryParameterError('state')
    }

    if (isNumber(state.deviceId) || isNumber(state.redirectUri) || isNumber(state.theme)) {
      return Promise.reject(new MissingQueryParameterError('state'))
    }

    const tokenPayload = jsonwebtoken.decode(token)

    if (!isIAMOAuthTokenPayload(tokenPayload)) {
      throw new InvalidCredentialsError('Invalid IAM OAuth token')
    }
    return DIContainer.sharedContainer.authService.iamOAuthCallback(tokenPayload, state)
  }

  /**
   * Sends email to reset password.
   */
  async sendPasswordResetInstructions(req: Request): Promise<void> {
    const email = req.body.email
    if (!isString(email)) {
      throw new ValidationError('email should be string', email)
    }

    return DIContainer.sharedContainer.authService.sendPasswordResetInstructions(
      email.toLowerCase()
    )
  }

  /**
   * Resets with new password.
   */
  async resetPassword(req: Request): Promise<AuthorizedUser> {
    const { password, token, deviceId } = req.body

    if (!isString(password) || !isString(token) || !isString(deviceId)) {
      throw new ValidationError('password, token & deviceId should be strings', req.body)
    }

    const appId = req.headers[APP_ID_HEADER_KEY]

    if (!isString(appId)) {
      throw new InvalidClientApplicationError(appId)
    }

    return DIContainer.sharedContainer.authService.resetPassword({
      deviceId,
      appId,
      tokenId: token,
      newPassword: password,
    })
  }

  /*
   * Logs the user out of the system.
   */
  async logout(req: Request): Promise<void> {
    // The 'authorization' header's value after prefix 'Bearer ' is the JWT payload.
    const authHeader = req.headers.authorization

    if (!authHeader || Array.isArray(authHeader)) {
      throw new ValidationError('Unexpected user token', authHeader)
    }

    if (!isBearerHeaderValue(authHeader)) {
      throw new ValidationError('Authorization header does not contain a bearer token', authHeader)
    }

    const token = authHeader.replace('Bearer ', '')

    return DIContainer.sharedContainer.authService.logout(token)
  }

  async backchannelLogout(req: Request): Promise<void> {
    const logoutToken = req.query.logout_token

    if (!isString(logoutToken)) {
      throw new InvalidBackchannelLogoutError('Logout token must be a string', logoutToken)
    }

    const tokenPayload = jsonwebtoken.decode(logoutToken)

    if (!isIAMLogoutTokenPayload(tokenPayload)) {
      throw new InvalidBackchannelLogoutError('Invalid backchannel logout token', tokenPayload)
    }

    return DIContainer.sharedContainer.authService.backchannelLogout(tokenPayload.sid)
  }

  /*
   * Refreshes the sync session for the given device
   */
  async refreshSyncSessions(req: Request): Promise<BucketSessions> {
    // The 'authorization' header's value after prefix 'Bearer ' is the JWT payload.
    const authHeader = req.headers.authorization

    if (!authHeader || Array.isArray(authHeader)) {
      throw new ValidationError('Unexpected user token', authHeader)
    }

    if (!isBearerHeaderValue(authHeader)) {
      throw new ValidationError('Authorization header does not contain a bearer token', authHeader)
    }

    const token = authHeader.replace('Bearer ', '')

    return DIContainer.sharedContainer.authService.refreshSyncSessions(token)
  }

  async changePassword(req: Request): Promise<void> {
    const { currentPassword, newPassword, deviceId } = req.body
    const user = req.user

    if (!user) {
      throw new ValidationError('User not found', user)
    }

    if (!isString(currentPassword) || !isString(newPassword)) {
      throw new ValidationError('Password must be a string', req.body)
    }

    return DIContainer.sharedContainer.authService.changePassword({
      userId: user._id,
      currentPassword,
      newPassword,
      deviceId,
    })
  }

  async createAuthorizationToken(req: Request): Promise<string> {
    const { scope } = req.params
    const user = req.user

    if (!isString(scope)) {
      throw new ValidationError('scope should be string', scope)
    }

    const scopeInfo = ContainerService.findScope(scope, config.scopes)

    const syncUserID = ContainerService.userIdForSync(user._id)

    const payload = {
      iss: config.API.hostname,
      sub: syncUserID,
      aud: scopeInfo.name,
      email: user.email,
    }

    const options = {
      header: {
        kid: scopeInfo.identifier,
      },
      algorithm: scopeInfo.publicKeyPEM === null ? 'HS256' : 'RS256',
      expiresIn: `${scopeInfo.expiry}m`,
    }

    return jsonwebtoken.sign(payload, scopeInfo.secret, options as any)
  }
}
