/*!
 * © 2023 Atypon Systems LLC
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
import { ConfigController } from './ConfigController'
import { defaultSchema, sharedSchema } from './ConfigSchema'

export class ConfigRoute extends BaseRoute {
  private get basePath(): string {
    return '/config'
  }
  private configController = new ConfigController()

  public create(router: Router): void {
    router.get(
      `${this.basePath}/shared/:fileName?/:id?`,
      celebrate(sharedSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getSharedData(req, res)
        }, next)
      }
    )
    router.get(
      `${this.basePath}/locales/:fileName?`,
      celebrate(defaultSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getLocales(req, res)
        }, next)
      }
    )
    router.get(
      `${this.basePath}/styles/:fileName?`,
      celebrate(defaultSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getStyles(req, res)
        }, next)
      }
    )
  }
  private async getSharedData(req: Request, res: Response) {
    let data
    const fileName = req.params.fileName
    const id = req.params.id
    if (fileName) {
      data = await this.configController.getSharedData(fileName, id)
    } else {
      data = await this.configController.getSharedData()
    }
    data ? res.status(StatusCodes.OK).send(data) : res.status(StatusCodes.NO_CONTENT)
  }
  private async getLocales(req: Request, res: Response) {
    let data
    const fileName = req.params.fileName
    if (fileName) {
      data = await this.configController.getLocales(fileName)
    } else {
      data = await this.configController.getLocales('locales.json')
    }
    data ? res.status(StatusCodes.OK).send(data) : res.status(StatusCodes.NO_CONTENT)
  }
  private async getStyles(req: Request, res: Response) {
    let data
    const fileName = req.params.fileName
    if (fileName) {
      data = await this.configController.getStyles(fileName)
    } else {
      data = await this.configController.getStyles()
    }
    data ? res.status(StatusCodes.OK).send(data) : res.status(StatusCodes.NO_CONTENT)
  }
}
