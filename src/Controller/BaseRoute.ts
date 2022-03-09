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

import { Router, NextFunction } from 'express'

export abstract class BaseRoute {
  /**
   * Creates routes.
   * router Express router.
   */
  abstract create(router: Router): void

  /**
   * Runs the provided code and handles exceptions and passes them to the next middleware.
   */
  protected async runWithErrorHandling(
    logic: () => Promise<void>,
    next: NextFunction
  ): Promise<void> {
    try {
      // run the logic
      await logic()
    } catch (error) {
      // invoke the next middleware and pass it the exception
      next(error)
    }
  }
}
