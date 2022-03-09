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

import { Request } from 'express'
import { isString } from '../../../util'

import { BaseController } from '../../BaseController'
import { ValidationError } from '../../../Errors'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { ISubmissionController } from './ISubmissionController'

export class SubmissionController extends BaseController implements ISubmissionController {
  /**
   * Deletes user from the system and all related data.
   */
  async updateStatus(req: Request): Promise<void> {
    const { eventKey } = req.body
    const { id } = req.params

    if (!isString(id)) {
      throw new ValidationError('id should be string.', id)
    }

    if (!isString(eventKey)) {
      throw new ValidationError('eventKey should be string.', eventKey)
    }

    return DIContainer.sharedContainer.submissionService.updateStatus(id, eventKey)
  }
}
