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

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { celebrate } from '../../../Utilities/celebrate'
import { BaseRoute } from '../../BaseRoute'
import { RegistrationController } from './RegistrationController'
import { connectSignupSchema } from './RegistrationSchema'

export class RegistrationRoute extends BaseRoute {
  private registrationController = new RegistrationController()

  /**
   * Returns auth route base path.
   *
   * @returns string
   */
  private get basePath(): string {
    return '/registration'
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}/connect/signup`,
      celebrate(connectSignupSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.secretValidation(),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.registrationController.connectSignup(req)
          res.status(StatusCodes.NO_CONTENT).end()
        }, next)
      }
    )
  }
}
