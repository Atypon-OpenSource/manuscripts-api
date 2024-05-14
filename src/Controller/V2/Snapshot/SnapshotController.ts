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

import type { SaveSnapshotRequest, Snapshot } from 'src/Models/SnapshotModel'

import { DIContainer } from '../../../DIContainer/DIContainer'
import { DocumentPermission } from '../../../DomainServices/DocumentService'
import { ValidationError } from '../../../Errors'
import { BaseController } from '../../BaseController'

export class SnapshotController extends BaseController {
  async createSnapshot(
    projectID: string,
    payload: SaveSnapshotRequest,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user,
      projectID,
      DocumentPermission.WRITE
    )
    const document = await DIContainer.sharedContainer.documentClient.findDocumentWithSnapshot(
      payload.docID
    )
    const snapshotModel = { docID: payload.docID, name: payload.name, snapshot: document.doc }
    await this.resetDocumentHistory(payload.docID)
    return await DIContainer.sharedContainer.snapshotClient.saveSnapshot(snapshotModel)
  }
  async deleteSnapshot(snapshotID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const snapshot = await this.fetchSnapshot(snapshotID)
    const manuscript = await DIContainer.sharedContainer.documentService.getManuscriptFromSnapshot(
      snapshot
    )
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user,
      manuscript.containerID,
      DocumentPermission.WRITE
    )
    return await DIContainer.sharedContainer.snapshotClient.deleteSnapshot(snapshotID)
  }
  async getSnapshot(snapshotID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const snapshot = await this.fetchSnapshot(snapshotID)
    const manuscript = await DIContainer.sharedContainer.documentService.getManuscriptFromSnapshot(
      snapshot
    )
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user,
      manuscript.containerID,
      DocumentPermission.READ
    )
    return await DIContainer.sharedContainer.snapshotClient.getSnapshot(snapshotID)
  }
  async listSnapshotLabels(
    projectID: string,
    manuscriptID: string,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user,
      projectID,
      DocumentPermission.READ
    )
    return await DIContainer.sharedContainer.snapshotClient.listSnapshotLabels(manuscriptID)
  }
  private async fetchSnapshot(snapshotID: string) {
    const result = await DIContainer.sharedContainer.snapshotClient.getSnapshot(snapshotID)
    const snapshot: Snapshot = JSON.parse(JSON.stringify(result))
    return snapshot
  }
  private async resetDocumentHistory(documentID: string) {
    await DIContainer.sharedContainer.documentClient.updateDocument(documentID, { steps: [] })
  }
}
