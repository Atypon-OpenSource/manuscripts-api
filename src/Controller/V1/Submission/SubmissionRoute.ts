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
import { updateStatusSchema } from './SubmissionSchema'
import { SubmissionController } from './SubmissionController'
import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'

export class SubmissionRoute extends BaseRoute {
  private submissionController = new SubmissionController()

  /**
   * Returns submission route base path.
   * @returns string
   */
  private get basePath (): string {
    return '/submission'
  }

  public create (router: Router): void {
    router.post(
      `${this.basePath}/status/:id`,
      AuthStrategy.verifyIpAddress,
      expressJoiMiddleware(updateStatusSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const user = await this.submissionController.updateStatus(req)
          res
            .status(HttpStatus.OK)
            .json(user)
            .end()
        }, next)
      }
    )
  }
}
