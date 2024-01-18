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

import type { ICreateDoc, IUpdateDocument } from 'types/quarterback/doc'

import type { IReceiveStepsRequest } from '../../../../types/quarterback/collaboration'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { QuarterbackPermission } from '../../../DomainServices/Quarterback/QuarterbackService'
import { ValidationError } from '../../../Errors'
import { BaseController } from '../../BaseController'
export class DocumentController extends BaseController {
  async createDocument(projectID: string, payload: ICreateDoc, user: Express.User | undefined) {
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
    return await DIContainer.sharedContainer.documentService.findDocumentWithSnapshot(manuscriptID)
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
    payload: IUpdateDocument,
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
  async getDocumentHistory(
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

    const found = await DIContainer.sharedContainer.documentService.findDocument(manuscriptID)
    const history = await DIContainer.sharedContainer.collaborationService.getHistoriesFromVersion(
      manuscriptID,
      0
    )

    return { ...history, doc: found.doc }
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
    return DIContainer.sharedContainer.collaborationService.getHistoriesFromVersion(
      manuscriptID,
      parseInt(versionID)
    )
  }
}
