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

import { DIContainer } from '../../../DIContainer/DIContainer'
import { celebrate } from '../../../Utilities/celebrate'
import { BaseRoute } from '../../BaseRoute'
import { ServerStatus } from './ServerStatus'
import { appVersionSchema } from './ServerStatusSchema'

export class ServerStatusRoute extends BaseRoute {
  private get basePath(): string {
    return '/app'
  }

  private static getVersion(_req: Request, res: Response, _next: NextFunction) {
    const version = ServerStatus.version

    return res.status(StatusCodes.OK).json({ version: version }).end()
  }

  public create(router: Router): void {
    router.get(
      `${this.basePath}/version`,
      celebrate(appVersionSchema),
      ServerStatusRoute.getVersion
    )
    router.get(`${this.basePath}/alive`, async (_req, res: Response) => {
      await DIContainer.sharedContainer.userBucket.ensureAlive()
      res.redirect('../version')
    })
  }
}
