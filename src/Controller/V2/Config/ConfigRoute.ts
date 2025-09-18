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
import { NextFunction, Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { celebrate } from '../../../Utilities/celebrate'
import { BaseRoute } from '../../BaseRoute'
import { ConfigController } from './ConfigController'
import { bundleSchema, defaultPathSchema, defaultQuerySchema, templateSchema } from './ConfigSchema'

const queryIDRoutes = [
  { path: '/templates', schema: templateSchema },
  { path: '/bundles', schema: bundleSchema },
  { path: '/csl/styles', schema: defaultQuerySchema },
  { path: '/csl/locales', schema: defaultQuerySchema },
]

const pathIDRoutes = [
  {
    path: '/languages',
    id: 'languages',
    schema: defaultPathSchema,
  },
]

export class ConfigRoute extends BaseRoute {
  private configController = new ConfigController()

  public create(router: Router): void {
    for (const route of queryIDRoutes) {
      router.get(
        route.path,
        celebrate(route.schema),
        AuthStrategy.JsonHeadersValidation,
        AuthStrategy.JWTAuth,
        (req: Request, res: Response, next: NextFunction) => {
          return this.runWithErrorHandling(async () => {
            const id = req.query.id as string
            await this.getDocument(id, res)
          }, next)
        }
      )
    }
    for (const route of pathIDRoutes) {
      router.get(
        route.path,
        celebrate(route.schema),
        AuthStrategy.JsonHeadersValidation,
        AuthStrategy.JWTAuth,
        (_req: Request, res: Response, next: NextFunction) => {
          return this.runWithErrorHandling(async () => {
            await this.getDocument(route.id, res)
          }, next)
        }
      )
    }
  }

  private async getDocument(id: string, res: Response) {
    const data = await this.configController.getDocument(id)
    if (!data) {
      res.status(StatusCodes.NOT_FOUND).send('No data found')
    } else {
      res.set('Content-Type', 'application/json')
      res.status(StatusCodes.OK).send(data)
    }
  }
}
