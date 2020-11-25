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
import * as HttpStatus from 'http-status-codes'
import { BaseRoute } from '../../BaseRoute'
import { TemplatesController } from './TemplatesController'

export class TemplatesRoute extends BaseRoute {
  private templateController = new TemplatesController()
  public create (router: Router): void {
    router.get(
        `/publishedTemplates`,
        (_req: Request, res: Response, next: NextFunction) => {
          return this.runWithErrorHandling(async () => {
            const output = await this.templateController.fetchPublishedTemplates()
            res
              .status(HttpStatus.OK)
              .json(output)
              .end()
          }, next)
        }
      )
  }
}
