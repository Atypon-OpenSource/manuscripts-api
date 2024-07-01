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

import { NextFunction, Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { celebrate } from '../../../Utilities/celebrate'
import { BaseRoute } from '../../BaseRoute'
import { AuthController } from './AuthController'
import { serverToServerTokenAuthSchema } from './AuthSchema'

export class AuthRoute extends BaseRoute {
  private authController = new AuthController()

  /**
   * Returns auth route base path.
   *
   * @returns string
   */
  private get basePath(): string {
    return '/auth'
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}/token/:connectUserID`,
      celebrate(serverToServerTokenAuthSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.secretValidation(),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.serverToServerTokenAuth(req, res)
        }, next)
      }
    )
  }

  private async serverToServerTokenAuth(req: Request, res: Response) {
    const { deviceId } = req.body
    const { connectUserID } = req.params
    const token = await this.authController.serverToServerTokenAuth({
      deviceID: deviceId,
      connectUserID,
    })
    res.status(StatusCodes.OK).json({ token }).end()
  }
}
