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

import type { Snapshot } from 'src/Models/SnapshotModel'
import type { ISaveSnapshotRequest } from 'types/quarterback/snapshot'

import { DIContainer } from '../../../DIContainer/DIContainer'
import { QuarterbackPermission } from '../../../DomainServices/Quarterback/QuarterbackService'
import { ValidationError } from '../../../Errors'
import { BaseController } from '../../BaseController'

export class SnapshotController extends BaseController {
  async createSnapshot(
    projectID: string,
    payload: ISaveSnapshotRequest,
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
    const found = await DIContainer.sharedContainer.documentService.findDocumentWithSnapshot(
      payload.docID
    )
    if (!('data' in found)) {
      return found
    }
    const snapshotModel = { docID: payload.docID, name: payload.name, snapshot: found.data.doc }
    await this.resetDocumentHistory(payload.docID)
    return await DIContainer.sharedContainer.snapshotService.saveSnapshot(snapshotModel)
  }
  async deleteSnapshot(snapshotID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const snapshot = await this.fetchSnapshot(snapshotID)
    const manuscript = await DIContainer.sharedContainer.quarterback.getManuscriptFromSnapshot(
      snapshot
    )
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      manuscript.containerID,
      QuarterbackPermission.WRITE
    )
    return await DIContainer.sharedContainer.snapshotService.deleteSnapshot(snapshotID)
  }
  async getSnapshot(snapshotID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const snapshot = await this.fetchSnapshot(snapshotID)
    const manuscript = await DIContainer.sharedContainer.quarterback.getManuscriptFromSnapshot(
      snapshot
    )
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      manuscript.containerID,
      QuarterbackPermission.READ
    )
    return await DIContainer.sharedContainer.snapshotService.getSnapshot(snapshotID)
  }
  async listSnapshotLabels(
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
    return await DIContainer.sharedContainer.snapshotService.listSnapshotLabels(manuscriptID)
  }
  private async fetchSnapshot(snapshotID: string) {
    const result = await DIContainer.sharedContainer.snapshotService.getSnapshot(snapshotID)
    if (!('data' in result)) {
      throw new ValidationError('Snapshot not found', snapshotID)
    }
    const snapshot: Snapshot = JSON.parse(JSON.stringify(result.data))
    return snapshot
  }
  private async resetDocumentHistory(documentID: string) {
    await DIContainer.sharedContainer.documentHistoryService.clearDocumentHistory(documentID)
  }
}
