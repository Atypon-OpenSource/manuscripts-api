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
import { Manuscript } from '@manuscripts/json-schema'
import { Request } from 'express'

import { DIContainer } from '../../../DIContainer/DIContainer'
import { RoleDoesNotPermitOperationError, ValidationError } from '../../../Errors'
import { ContainerRole } from '../../../Models/ContainerModels'
import { Snapshot } from '../../../Models/SnapshotModel'
import { ContainedBaseController } from '../../ContainedBaseController'

//To be updated with new more targeted permissions (ex. UPDATE_AUTHORS)
export enum QuarterbackPermission {
  READ,
  WRITE,
}

const EMPTY_PERMISSIONS = new Set<QuarterbackPermission>()
export class QuarterbackController extends ContainedBaseController {
  async getPermissions(
    projectID: string,
    userID: string
  ): Promise<ReadonlySet<QuarterbackPermission>> {
    const project = await DIContainer.sharedContainer.projectService.getProject(projectID)
    const role = DIContainer.sharedContainer.containerService.getUserRole(project, userID)
    switch (role) {
      case ContainerRole.Owner:
      case ContainerRole.Writer:
      case ContainerRole.Editor:
      case ContainerRole.Annotator:
      case ContainerRole.Proofer:
        return new Set([QuarterbackPermission.READ, QuarterbackPermission.WRITE])
      case ContainerRole.Viewer:
        return new Set([QuarterbackPermission.READ])
    }
    return EMPTY_PERMISSIONS
  }
  async createDocument(req: Request): Promise<Buffer> {
    const { projectID } = req.params
    await this.validateUserAccess(req.user, projectID, QuarterbackPermission.WRITE)
    const doc = req.body
    doc.user_model_id = req.user?._id
    return DIContainer.sharedContainer.quarterback.createDocument(doc)
  }

  async getDocument(req: Request): Promise<Buffer> {
    const { projectID, manuscriptID } = req.params
    await this.validateUserAccess(req.user, projectID, QuarterbackPermission.READ)
    return DIContainer.sharedContainer.quarterback.getDocument(manuscriptID)
  }

  async deleteDocument(req: Request): Promise<Buffer> {
    const { projectID, manuscriptID } = req.params
    await this.validateUserAccess(req.user, projectID, QuarterbackPermission.WRITE)
    return DIContainer.sharedContainer.quarterback.deleteDocument(manuscriptID)
  }

  async updateDocument(req: Request): Promise<Buffer> {
    const { projectID, manuscriptID } = req.params
    await this.validateUserAccess(req.user, projectID, QuarterbackPermission.WRITE)
    return DIContainer.sharedContainer.quarterback.updateDocument(req.body, manuscriptID)
  }

  async createSnapshot(req: Request): Promise<Buffer> {
    const { projectID } = req.params
    await this.validateUserAccess(req.user, projectID, QuarterbackPermission.WRITE)
    const doc = req.body
    return DIContainer.sharedContainer.quarterback.createSnapshot(doc)
  }

  async deleteSnapshot(req: Request): Promise<Buffer> {
    const { snapshotID } = req.params
    const snapshot = await this.fetchSnapshot(snapshotID)
    const manuscript = await this.getManuscriptFromSnapshot(snapshot)
    await this.validateUserAccess(req.user, manuscript.containerID, QuarterbackPermission.WRITE)
    return DIContainer.sharedContainer.quarterback.deleteSnapshot(snapshotID)
  }

  private async fetchSnapshot(snapshotID: string) {
    const result = await DIContainer.sharedContainer.quarterback.getSnapshot(snapshotID)
    if (!result) {
      throw new ValidationError('Snapshot not found', snapshotID)
    }
    const snapshot: Snapshot = JSON.parse(result.toString())
    return snapshot
  }

  async getSnapshotLabels(req: Request): Promise<Buffer> {
    const { projectID, manuscriptID } = req.params
    await this.validateUserAccess(req.user, projectID, QuarterbackPermission.READ)
    return DIContainer.sharedContainer.quarterback.getSnapshotLabels(manuscriptID)
  }

  async getSnapshot(req: Request): Promise<Snapshot> {
    const { snapshotID } = req.params
    const snapshot: Snapshot = await this.fetchSnapshot(snapshotID)
    const manuscript = await this.getManuscriptFromSnapshot(snapshot)
    await this.validateUserAccess(req.user, manuscript.containerID, QuarterbackPermission.READ)
    return snapshot
  }

  private async getManuscriptFromSnapshot(snapshot: Snapshot) {
    const manuscriptID = snapshot.doc_id
    const manuscript: Manuscript | null =
      await DIContainer.sharedContainer.manuscriptRepository.getById(manuscriptID)

    if (!manuscript) {
      throw new ValidationError('Manuscript not found', manuscriptID)
    }
    return manuscript
  }

  private async validateUserAccess(
    user: Express.User | undefined,
    projectID: string,
    permission: QuarterbackPermission
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(permission)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }
  }
}
