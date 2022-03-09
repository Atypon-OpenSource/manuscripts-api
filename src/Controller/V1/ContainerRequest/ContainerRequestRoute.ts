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
import { createRequestSchema, containerRequestSchema } from './ContainerRequestSchema'
import { ContainerRequestController } from './ContainerRequestController'
import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'

export class ContainerRequestRoute extends BaseRoute {
  private containerRequestController = new ContainerRequestController()

  /**
   * Returns request route base path.
   *
   * @returns string
   */
  private get basePath(): string {
    return '/request'
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}/:containerID/create`,
      expressJoiMiddleware(createRequestSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containerRequestController.create(req)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:containerID/accept`,
      expressJoiMiddleware(containerRequestSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containerRequestController.response(req, true)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:containerID/reject`,
      expressJoiMiddleware(containerRequestSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containerRequestController.response(req, false)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )
  }
}
