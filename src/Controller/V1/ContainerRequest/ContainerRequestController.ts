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
import { IContainerRequestController } from './IContainerRequestController'
import { BaseController } from '../../BaseController'
import { ValidationError } from '../../../Errors'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { ContainerRole } from '../../../Models/ContainerModels'

export class ContainerRequestController
  extends BaseController
  implements IContainerRequestController
{
  async create(req: Request): Promise<void> {
    const {
      params: { containerID },
      body: { role },
      user,
    } = req

    if (!isString(containerID)) {
      throw new ValidationError('containerID should be string', containerID)
    }

    if (!(role in ContainerRole)) {
      throw new ValidationError('role should be one of allowed container roles', role)
    }

    return DIContainer.sharedContainer.containerRequestService.create(user, containerID, role)
  }

  async response(req: Request, accept: boolean): Promise<void> {
    const {
      params: { containerID },
      body: { requestID },
      user,
    } = req

    if (!isString(containerID)) {
      throw new ValidationError('containerID should be string', containerID)
    }

    if (!isString(requestID)) {
      throw new ValidationError('requestID should be string', requestID)
    }

    return DIContainer.sharedContainer.containerRequestService.response(requestID, user, accept)
  }
}
