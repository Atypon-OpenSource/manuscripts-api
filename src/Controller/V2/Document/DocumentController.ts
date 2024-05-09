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

import { DIContainer } from '../../../DIContainer/DIContainer'
import { QuarterbackPermission } from '../../../DomainServices/QuarterbackService'
import { ValidationError } from '../../../Errors'
import { ReceiveSteps } from '../../../Models/AuthorityModels'
import { CreateDoc, UpdateDocument } from '../../../Models/DocumentModels'
import { BaseController } from '../../BaseController'
export class DocumentController extends BaseController {
  async createDocument(projectID: string, payload: CreateDoc, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterbackService.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return await DIContainer.sharedContainer.documentClient.createDocument(payload, user.id)
  }

  async getDocument(projectID: string, manuscriptID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterbackService.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.READ
    )
    return await DIContainer.sharedContainer.documentClient.findDocumentWithSnapshot(manuscriptID)
  }

  async deleteDocument(projectID: string, manuscriptID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterbackService.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return DIContainer.sharedContainer.documentClient.deleteDocument(manuscriptID)
  }
  async updateDocument(
    projectID: string,
    manuscriptID: string,
    payload: UpdateDocument,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterbackService.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return DIContainer.sharedContainer.documentClient.updateDocument(manuscriptID, payload)
  }
  async receiveSteps(
    projectID: string,
    manuscriptID: string,
    payload: ReceiveSteps,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterbackService.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return await DIContainer.sharedContainer.authorityService.receiveSteps(manuscriptID, payload)
  }

  async getEvents(
    projectID: string,
    manuscriptID: string,
    versionID: number,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterbackService.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.READ
    )
    return await DIContainer.sharedContainer.authorityService.getEvents(manuscriptID, versionID)
  }
}
