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

import { Manuscript, Model, Project, UserCollaborator } from '@manuscripts/json-schema'

import { DIContainer } from '../../../DIContainer/DIContainer'
import { ProjectPermission } from '../../../DomainServices/ProjectService'
import { RoleDoesNotPermitOperationError } from '../../../Errors'
import { ProjectUserRole } from '../../../Models/ContainerModels'
import { BaseController } from '../../BaseController'

export class ProjectController extends BaseController {
  async createProject(
    title: string,
    projectID: string | undefined,
    user: Express.User
  ): Promise<Project> {
    //todo check access
    return await DIContainer.sharedContainer.projectService.createProject(
      user._id,
      projectID,
      title
    )
  }

  async updateProject(projectID: string, data: any, user: Express.User): Promise<void> {
    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.UPDATE)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    //todo validate and check fine-grained access
    await DIContainer.sharedContainer.projectService.updateProject(projectID, data)
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

  async getProjectModels(projectID: string, types: any, user: Express.User): Promise<Model[]> {
    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    let models = await DIContainer.sharedContainer.projectService.getProjectModels(projectID)

    if (types?.length) {
      models = models.filter((m) => types.includes(m.objectType))
    }

    return models
  }

  async updateUserRole(
    projectID: string,
    userID: string,
    role: ProjectUserRole,
    user: Express.User
  ): Promise<void> {
    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.UPDATE_ROLES)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    await DIContainer.sharedContainer.projectService.updateUserRole(projectID, userID, role)
  }

  async createManuscript(
    projectID: string,
    manuscriptID: string | undefined,
    templateID: string | undefined,
    user: Express.User
  ): Promise<Manuscript> {
    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.CREATE_MANUSCRIPT)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    return await DIContainer.sharedContainer.projectService.createManuscript(
      projectID,
      manuscriptID,
      templateID
    )
  }

  async getCollaborators(projectID: string, user: Express.User): Promise<UserCollaborator[]> {
    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    return await DIContainer.sharedContainer.userService.getCollaborators(projectID)
  }

  async getArchive(
    projectID: string,
    manuscriptID: string,
    onlyIDs: any,
    accept: any,
    user: Express.User
  ) {
    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    const options = {
      getAttachments: accept !== 'application/json',
      onlyIDs: onlyIDs === 'true',
      includeExt: true,
    }

    return await DIContainer.sharedContainer.projectService.makeArchive(
      projectID,
      manuscriptID,
      options
    )
  }

  async generateAccessToken(projectID: string, scope: string, user: Express.User): Promise<string> {
    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    return DIContainer.sharedContainer.projectService.generateAccessToken(
      projectID,
      user._id,
      scope
    )
  }

  async deleteProject(projectID: string, user: Express.User): Promise<void> {
    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.DELETE)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    await DIContainer.sharedContainer.projectService.deleteProject(projectID)
  }

  async getPermissions(projectID: string, userID: string): Promise<ReadonlySet<ProjectPermission>> {
    return DIContainer.sharedContainer.projectService.getPermissions(projectID, userID)
  }
}
