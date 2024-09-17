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

import { Manuscript, Model, ObjectTypes, Project, UserProfile } from '@manuscripts/json-schema'

import { DIContainer } from '../../../DIContainer/DIContainer'
import {
  MissingContainerError,
  MissingRecordError,
  RecordNotFoundError,
  RoleDoesNotPermitOperationError,
} from '../../../Errors'
import { ProjectPermission, ProjectUserRole } from '../../../Models/ProjectModels'
import { BaseController } from '../../BaseController'

export class ProjectController extends BaseController {
  async createProject(title: string, user: Express.User): Promise<Project> {
    //todo check access
    return await DIContainer.sharedContainer.projectService.createProject(user.id, title)
  }

  async updateProject(data: Model[], user: Express.User, projectID: string): Promise<void> {
    const permissions = await this.getPermissions(projectID, user.id)
    if (!permissions.has(ProjectPermission.UPDATE)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
    }

    //todo validate and check fine-grained access
    await DIContainer.sharedContainer.projectService.updateProject(projectID, data)
  }

  async updateManuscript(user: Express.User, projectID: string, manuscriptID: string, doi: string) {
    const permissions = await this.getPermissions(projectID, user.id)
    if (!permissions.has(ProjectPermission.UPDATE)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
    }
    const models: Model[] = await this.getProjectModels([ObjectTypes.Manuscript], user, projectID)
    if (!models || models.length == 0) {
      throw new RecordNotFoundError(manuscriptID)
    }
    const manuscript = models[0] as Manuscript
    manuscript.DOI = doi
    await DIContainer.sharedContainer.projectService.updateManuscript(manuscript)
  }

  async isProjectCacheValid(
    projectID: string,
    modifiedSince: Date | number | string | undefined
  ): Promise<boolean> {
    if (!modifiedSince) {
      return false
    }
    const project = await DIContainer.sharedContainer.projectService.getProject(projectID)

    return new Date(modifiedSince).getTime() / 1000 >= project.updatedAt
  }

  async getProjectModels(types: any, user: Express.User, projectID: string): Promise<Model[]> {
    const permissions = await this.getPermissions(projectID, user.id)
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
    }

    let models =
      (await DIContainer.sharedContainer.projectService.getProjectModels(projectID)) || []

    if (types?.length) {
      models = models.filter((m) => types.includes(m.objectType))
    }

    return models
  }

  async updateUserRole(
    connectUserID: string,
    role: ProjectUserRole,
    user: Express.User,
    projectID: string
  ): Promise<void> {
    const permissions = await this.getPermissions(projectID, user.id)
    if (!permissions.has(ProjectPermission.UPDATE_ROLES)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
    }

    await DIContainer.sharedContainer.projectService.updateUserRole(projectID, connectUserID, role)
  }

  async createManuscript(
    user: Express.User,
    projectID: string,
    templateID?: string
  ): Promise<Manuscript> {
    const permissions = await this.getPermissions(projectID, user.id)
    if (!permissions.has(ProjectPermission.CREATE_MANUSCRIPT)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
    }
    return DIContainer.sharedContainer.projectService.createManuscript(
      projectID,
      user.id,
      templateID
    )
  }

  async importJats(
    user: Express.User,
    zip: Express.Multer.File,
    projectID: string,
    templateID?: string
  ): Promise<Manuscript> {
    const permissions = await this.getPermissions(projectID, user.id)
    if (!permissions.has(ProjectPermission.CREATE_MANUSCRIPT)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
    }

    return await DIContainer.sharedContainer.projectService.importJats(
      user.id,
      zip,
      projectID,
      templateID
    )
  }

  async getUserProfiles(user: Express.User, projectID: string): Promise<UserProfile[]> {
    const permissions = await this.getPermissions(projectID, user.id)
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
    }
    return await DIContainer.sharedContainer.userService.getProjectUserProfiles(projectID)
  }

  async exportJats(projectID: string, manuscriptID: string, user: Express.User): Promise<string> {
    const permissions = await this.getPermissions(projectID, user.id)
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
    }
    return await DIContainer.sharedContainer.projectService.exportJats(projectID, manuscriptID)
  }
  async getArchive(onlyIDs: any, accept: any, user: Express.User, projectID: string) {
    const permissions = await this.getPermissions(projectID, user.id)
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
    }

    const options = {
      getAttachments: accept !== 'application/json',
      onlyIDs: onlyIDs === 'true',
      includeExt: true,
    }

    return await DIContainer.sharedContainer.projectService.makeArchive(projectID, options)
  }

  async deleteProject(projectID: string, user: Express.User): Promise<void> {
    try {
      const permissions = await this.getPermissions(projectID, user.id)
      if (!permissions.has(ProjectPermission.DELETE)) {
        throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
      }
      await DIContainer.sharedContainer.projectService.deleteProject(projectID)
    } catch (error) {
      if (!(error instanceof MissingContainerError || error instanceof MissingRecordError)) {
        throw error
      }
    }
  }

  async getPermissions(projectID: string, userID: string): Promise<ReadonlySet<ProjectPermission>> {
    return DIContainer.sharedContainer.projectService.getPermissions(projectID, userID)
  }
}
