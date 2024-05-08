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

import { DIContainer } from '../DIContainer/DIContainer'
import { MissingManuscriptError, RoleDoesNotPermitOperationError } from '../Errors'
import { ProjectUserRole } from '../Models/ProjectModels'
import { Snapshot } from '../Models/SnapshotModel'

export enum QuarterbackPermission {
  READ,
  WRITE,
}

export interface SnapshotLabelResult {
  id: string
  name: string
  createdAt: number
}
const EMPTY_PERMISSIONS = new Set<QuarterbackPermission>()

export class QuarterbackService {
  async getPermissions(
    projectID: string,
    userID: string
  ): Promise<ReadonlySet<QuarterbackPermission>> {
    const project = await DIContainer.sharedContainer.projectService.getProject(projectID)
    const role = DIContainer.sharedContainer.projectService.getUserRole(project, userID)
    switch (role) {
      case ProjectUserRole.Owner:
      case ProjectUserRole.Writer:
      case ProjectUserRole.Editor:
      case ProjectUserRole.Annotator:
      case ProjectUserRole.Proofer:
        return new Set([QuarterbackPermission.READ, QuarterbackPermission.WRITE])
      case ProjectUserRole.Viewer:
        return new Set([QuarterbackPermission.READ])
    }
    return EMPTY_PERMISSIONS
  }

  public async validateUserAccess(
    user: Express.User,
    projectID: string,
    permission: QuarterbackPermission
  ) {
    const permissions = await this.getPermissions(projectID, user.userID)
    if (!permissions.has(permission)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.userID)
    }
  }

  public async getManuscriptFromSnapshot(snapshot: Snapshot) {
    const manuscriptID = snapshot.doc_id
    const manuscript: Manuscript | null =
      await DIContainer.sharedContainer.projectClient.getProject(manuscriptID)

    if (!manuscript) {
      throw new MissingManuscriptError(manuscriptID)
    }
    return manuscript
  }
}
