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
import { SGController } from './SGController'
import { sgDeleteSchema, sgGetSchema, sgPostSchema, sgPutSchema } from './SGSchema'

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
      celebrate(sgGetSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.sgController.get(req)
          res.status(StatusCodes.OK).send(result ? result : {})
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:db`,
      celebrate(sgPostSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.sgController.create(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )

    router.put(
      `${this.basePath}/:db/:id`,
      celebrate(sgPutSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.sgController.update(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )

    router.delete(
      `${this.basePath}/:db/:id`,
      celebrate(sgDeleteSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.sgController.remove(req)
          res.status(StatusCodes.OK).send()
        }, next)
      }
    )
  }
}
