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

import { DIContainer } from '../../../DIContainer/DIContainer'
import { InvalidClientApplicationError, InvalidCredentialsError } from '../../../Errors'
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
}
