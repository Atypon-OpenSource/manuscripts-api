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

import { IUserController } from './IUserController'
import { BaseController, authorizationBearerToken } from '../../BaseController'
import { ValidationError } from '../../../Errors'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { UserProfileLike } from '../../../DataAccess/Interfaces/Models'
import { Container } from '../../../Models/ContainerModels'
import { isString } from '../../../util'

export class UserController extends BaseController implements IUserController {
  /**
   * Sets the user deleteAt property.
   */
  async markUserForDeletion(req: Request): Promise<void> {
    const { user } = req
    const { password } = req.body

    if (!user) {
      throw new ValidationError('user not found', req.user)
    }

    if (password && !isString(req.body.password)) {
      throw new ValidationError('Password must be a string', req.body)
    }

    return DIContainer.sharedContainer.userService.markUserForDeletion(user._id, password)
  }

  /**
   * Sets the user deleteAt property to undefined.
   */
  async unmarkUserForDeletion(req: Request): Promise<void> {
    const { user } = req

    if (!user) {
      throw new ValidationError('user not found', req.user)
    }

    return DIContainer.sharedContainer.userService.unmarkUserForDeletion(user._id)
  }

  async getProfile(req: Request): Promise<UserProfileLike | null> {
    const token = authorizationBearerToken(req)
    return DIContainer.sharedContainer.userService.profile(token)
  }

  async userContainers(req: Request): Promise<Container[]> {
    return DIContainer.sharedContainer.projectRepository.getUserContainers(req.user._id)
  }
}
