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

import type { ICreateDocRequest, IUpdateDocumentRequest } from 'types/quarterback/doc'

import type { IReceiveStepsRequest } from '../../../../types/quarterback/collaboration'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { QuarterbackPermission } from '../../../DomainServices/Quarterback/QuarterbackService'
import { ValidationError } from '../../../Errors'
import { BaseController } from '../../BaseController'
export class DocumentController extends BaseController {
  async createDocument(
    projectID: string,
    payload: ICreateDocRequest,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return await DIContainer.sharedContainer.documentService.createDocument(payload, user._id)
  }

  async getDocument(projectID: string, manuscriptID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.READ
    )
    return await this.fetchDocumentAndHistory(manuscriptID)
  }
  private async fetchDocumentAndHistory(manuscriptID: string) {
    const document = await DIContainer.sharedContainer.documentService.findDocumentWithSnapshot(
      manuscriptID
    )
    const documentHistory =
      await DIContainer.sharedContainer.documentHistoryService.findLatestDocumentHistory(
        manuscriptID
      )
    if ('data' in document && 'data' in documentHistory) {
      const updatedDocument = {
        data: {
          ...document.data,
          version: documentHistory.data.version,
          doc: document.data.doc,
        },
      }
      return updatedDocument
    }
    return document
  }
  async deleteDocument(projectID: string, manuscriptID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return DIContainer.sharedContainer.documentService.deleteDocument(manuscriptID)
  }
  async updateDocument(
    projectID: string,
    manuscriptID: string,
    payload: IUpdateDocumentRequest,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return DIContainer.sharedContainer.documentService.updateDocument(manuscriptID, payload)
  }
  async receiveSteps(
    projectID: string,
    manuscriptID: string,
    payload: IReceiveStepsRequest,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return await DIContainer.sharedContainer.collaborationService.receiveSteps(
      manuscriptID,
      payload
    )
  }
  async getInitialHistoryWithDocument(
    projectID: string,
    manuscriptID: string,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.READ
    )

    return await DIContainer.sharedContainer.collaborationService.getInitialHistoryWithDocument(
      manuscriptID
    )
  }

  async getStepsFromVersion(
    projectID: string,
    manuscriptID: string,
    versionID: string,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.READ
    )
    return DIContainer.sharedContainer.collaborationService.getMergedHistoriesFromVersion(
      manuscriptID,
      parseInt(versionID)
    )
  }
}
