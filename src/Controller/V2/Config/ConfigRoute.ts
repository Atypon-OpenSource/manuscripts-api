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
import { defaultSchema, sectionsSchema } from './ConfigSchema'

const routes = [
  { path: '/templates', schema: defaultSchema, fileName: 'templates' },
  { path: '/bundles', schema: defaultSchema, fileName: 'bundles' },
  { path: '/csl/styles', schema: defaultSchema, fileName: 'styles' },
  { path: '/csl/locales', schema: defaultSchema, fileName: 'locales' },
  { path: '/section-categories', schema: sectionsSchema, fileName: 'section-categories' },
]

export class ConfigRoute extends BaseRoute {
  private configController = new ConfigController()

  public create(router: Router): void {
    for (const route of routes) {
      router.get(
        route.path,
        celebrate(route.schema),
        AuthStrategy.JsonHeadersValidation,
        AuthStrategy.JWTAuth,
        (req: Request, res: Response, next: NextFunction) => {
          return this.runWithErrorHandling(async () => {
            await this.getData(req, res, route.fileName)
          }, next)
        }
      )
    }
  }

  private async getData(req: Request, res: Response, fileName: string) {
    const { ids } = req.query
    const data = await this.configController.getData(fileName, ids)
    if (!data) {
      res.status(StatusCodes.NOT_FOUND).send('No data found')
    } else {
      res.set('Content-Type', 'application/json')
      res.status(StatusCodes.OK).send(data)
    }
  }
}
