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
import jwt from 'jsonwebtoken'

import { config } from '../../../Config/Config'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { ContainerService } from '../../../DomainServices/Container/ContainerService'
import {
  InvalidClientApplicationError,
  InvalidCredentialsError,
  ValidationError,
} from '../../../Errors'
import { AuthorizedUser } from '../../../Models/UserModels'
import { isString } from '../../../util'
import { BaseController } from '../../BaseController'

/**
 * The app-id header key.
 */
export const APP_ID_HEADER_KEY = 'manuscripts-app-id'

/**
 * The app-secret header key.
 */
export const APP_SECRET_HEADER_KEY = 'manuscripts-app-secret'

export class AuthController extends BaseController {
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

  async createAuthorizationToken(req: Request): Promise<string> {
    const { scope } = req.params
    const user = req.user

    if (!user) {
      throw new ValidationError('No user found', user)
    }

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

    return jwt.sign(payload, scopeInfo.secret, {
      algorithm: scopeInfo.publicKeyPEM === null ? 'HS256' : 'RS256',
      keyid: scopeInfo.identifier,
      expiresIn: `${scopeInfo.expiry}m`,
      allowInsecureKeySizes: true,

    })
  }
}
