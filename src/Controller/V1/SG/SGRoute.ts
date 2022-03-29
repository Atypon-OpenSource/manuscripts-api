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
import { SGController } from './SGController'
import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { sgGetSchema, sgPostSchema, sgPutSchema } from './SGSchema'

export class SGRoute extends BaseRoute {
  private sgController = new SGController()

  /**
   * Returns auth route base path.
   *
   * @returns string
   */
  private get basePath(): string {
    return '/sg'
  }

  public create(router: Router): void {
    router.get(
      `${this.basePath}/:db/:id`,
      expressJoiMiddleware(sgGetSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.sgController.get(req)
          res.status(HttpStatus.OK).send(result ? result : {})
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:db`,
      expressJoiMiddleware(sgPostSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.sgController.create(req)
          res.status(HttpStatus.OK).send(result)
        }, next)
      }
    )

    router.put(
      `${this.basePath}/:db/:id`,
      expressJoiMiddleware(sgPutSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.sgController.update(req)
          res.status(HttpStatus.OK).send(result)
        }, next)
      }
    )

    router.delete(
      `${this.basePath}/:db/:id`,
      expressJoiMiddleware(sgPutSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.sgController.remove(req)
          res.status(HttpStatus.OK).send()
        }, next)
      }
    )
  }
}
