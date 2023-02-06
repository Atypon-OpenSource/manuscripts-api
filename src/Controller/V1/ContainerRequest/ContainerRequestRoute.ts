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

import { celebrate } from 'celebrate'
import { NextFunction, Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { BaseRoute } from '../../BaseRoute'
import { ContainerRequestController } from './ContainerRequestController'
import { containerRequestSchema, createRequestSchema } from './ContainerRequestSchema'

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
      celebrate(createRequestSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containerRequestController.create(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:containerID/accept`,
      celebrate(containerRequestSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containerRequestController.response(req, true)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:containerID/reject`,
      celebrate(containerRequestSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containerRequestController.response(req, false)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )
  }
}
