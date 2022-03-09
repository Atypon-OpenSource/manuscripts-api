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

const expressJoiMiddleware = require('express-joi-middleware')
import { NextFunction, Request, Response, Router } from 'express'
import * as HttpStatus from 'http-status-codes'

import { BaseRoute } from '../../BaseRoute'
import { userSchema } from './UserSchema'
import { UserController } from './UserController'
import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'

export class UserRoute extends BaseRoute {
  private userController = new UserController()

  /**
   * Returns deletion route base path.
   * @returns string
   */
  private get basePath(): string {
    return '/user'
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}/mark-for-deletion`,
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.userController.markUserForDeletion(req)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/unmark-for-deletion`,
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.userController.unmarkUserForDeletion(req)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )

    router.get(
      `${this.basePath}`,
      expressJoiMiddleware(userSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const user = await this.userController.getProfile(req)
          res.status(HttpStatus.OK).json(user).end()
        }, next)
      }
    )

    router.get(
      `${this.basePath}/projects`,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.userController.userContainers(req))
        }, next)
      }
    )
  }
}
