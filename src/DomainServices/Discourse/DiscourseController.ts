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
import * as jsonwebtoken from 'jsonwebtoken'
import * as _ from 'lodash'

import { BaseController, authorizationBearerToken } from '../../Controller/BaseController'
import { MissingQueryParameterError, InvalidCredentialsError, ValidationError } from '../../Errors'
import { isLoginTokenPayload } from '../../Utilities/JWT/LoginTokenPayload'
import { DiscourseService, DiscourseFeedbackPost } from './DiscourseService'
import { ensureValidUser } from '../../Models/UserModels'

export interface URLResponse {
  url: string
}

export class DiscourseController extends BaseController {
  constructor (readonly discourseService: DiscourseService) { super() }

  discourseAccountDetails (req: Request): Promise<any> {
    const user = ensureValidUser(req.user)
    return this.discourseService.ensureDiscourseUserExists(user)
  }

  /**
   * Logs user into a Discourse site connected to this API server instance.
   */
  discourseLogin (req: Request): URLResponse {
    const discourseToken = req.query.sso
    const discourseSig = req.query.sig

    if (!_.isString(discourseToken)) {
      throw new MissingQueryParameterError('sso')
    }

    if (!_.isString(discourseSig)) {
      throw new MissingQueryParameterError('sig')
    }
    const token = authorizationBearerToken(req)
    const payload = jsonwebtoken.decode(token)
    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Invalid auth token')
    }

    const redirectURL = this.discourseService.discourseRedirectURL(discourseToken, discourseSig, payload)
    return { url: redirectURL }
  }

  async postFeedback (req: Request): Promise<DiscourseFeedbackPost> {
    const user = ensureValidUser(req.user)
    if (!req.body) {
      throw new ValidationError('Request body missing', req.body)
    }

    if (typeof (req.body.messagePrivately) !== 'boolean') {
      throw new ValidationError('Missing or non-boolean parameter "messagePrivately"', null)
    }

    return this.discourseService.postFeedback(user, req.body.title, req.body.message, req.body.messagePrivately)
  }
}
