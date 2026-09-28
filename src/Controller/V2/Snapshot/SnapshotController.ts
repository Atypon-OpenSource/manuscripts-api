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

import type { SaveSnapshotRequest, Snapshot } from 'src/Models/SnapshotModels'

import { DIContainer } from '../../../DIContainer/DIContainer'
import { DocumentPermission } from '../../../DomainServices/DocumentService'
import { ValidationError } from '../../../Errors'
import { decodeSnapshotID, encodeSnapshotID } from '../../../Utilities/CfWorker/SnapshotIdCodec'
import { resolveV3Route } from '../../../Utilities/CfWorker/routing'
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
    // payload.docID (not the URL's :manuscriptID) is the existing v2 API's
    // actual manuscript identifier — preserved as-is, see Global Constraints.
    const route = await resolveV3Route(projectID, payload.docID)
    if (route.proxied) {
      const label = await DIContainer.sharedContainer.cfWorkerClient.createSnapshot(
        user.connectUserID,
        route.docID,
        payload.name
      )
      return {
        id: encodeSnapshotID(route.docID, label.id),
        name: label.name,
        createdAt: label.createdAt,
      }
    }
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user.id,
      projectID,
      DocumentPermission.WRITE
    )
    const document = await DIContainer.sharedContainer.documentClient.findDocument(payload.docID)
    const snapshotModel = { docID: payload.docID, name: payload.name, snapshot: document.doc }
    await this.resetDocumentHistory(payload.docID)
    return await DIContainer.sharedContainer.snapshotClient.saveSnapshot(snapshotModel)
  }

  async deleteSnapshot(snapshotID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const decoded = decodeSnapshotID(snapshotID)
    if (decoded) {
      return DIContainer.sharedContainer.cfWorkerClient.deleteSnapshot(
        user.connectUserID,
        decoded.docID,
        decoded.id
      )
    }
    const snapshot = await this.fetchSnapshot(snapshotID)
    const manuscript = await DIContainer.sharedContainer.documentService.getManuscriptFromSnapshot(
      snapshot
    )
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user.id,
      manuscript.containerID,
      DocumentPermission.WRITE
    )
    return await DIContainer.sharedContainer.snapshotClient.deleteSnapshot(snapshotID)
  }

  async getSnapshot(snapshotID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const decoded = decodeSnapshotID(snapshotID)
    if (decoded) {
      const stored = await DIContainer.sharedContainer.cfWorkerClient.getSnapshot(
        user.connectUserID,
        decoded.docID,
        decoded.id
      )
      // Matches manuscripts-article-editor's actual ManuscriptSnapshot type
      // ({id, name, snapshot: PMDoc, createdAt}) — snapshot is a ProseMirror
      // doc object, not a JSON string (CompareDocumentsModal.tsx calls
      // schema.nodeFromJSON(snapshot.snapshot) directly on it).
      return {
        id: encodeSnapshotID(decoded.docID, stored.id),
        name: stored.name,
        snapshot: stored.doc,
        createdAt: stored.createdAt,
      }
    }
    const snapshot = await this.fetchSnapshot(snapshotID)
    const manuscript = await DIContainer.sharedContainer.documentService.getManuscriptFromSnapshot(
      snapshot
    )
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user.id,
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
    const route = await resolveV3Route(projectID, manuscriptID)
    if (route.proxied) {
      const labels = await DIContainer.sharedContainer.cfWorkerClient.listSnapshots(
        user.connectUserID,
        route.docID
      )
      return labels.map((label) => ({
        id: encodeSnapshotID(route.docID, label.id),
        name: label.name,
        createdAt: label.createdAt,
      }))
    }
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user.id,
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
