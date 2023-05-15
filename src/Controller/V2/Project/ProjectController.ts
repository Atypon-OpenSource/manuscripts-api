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
import { Request } from 'express'

import { DIContainer } from '../../../DIContainer/DIContainer'
import { ProjectPermission } from '../../../DomainServices/ProjectService'
import { RoleDoesNotPermitOperationError, ValidationError } from '../../../Errors'
import { BaseController } from '../../BaseController'

export class ProjectController extends BaseController {
  async createProject(req: Request): Promise<Project> {
    const title = req.body.title
    const projectID = req.params?.projectID
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }

    //todo check access

    return await DIContainer.sharedContainer.projectService.createProject(
      user._id,
      projectID,
      title
    )
  }

  async updateProject(req: Request): Promise<void> {
    const { projectID } = req.params
    const { data } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID parameter must be specified', projectID)
    }

    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.UPDATE)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    //todo validate and check fine-grained access
    await DIContainer.sharedContainer.projectService.updateProject(projectID, data)
  }

  async isProjectCacheValid(req: Request): Promise<boolean> {
    const { projectID } = req.params
    const modifiedSince = req.headers['if-modified-since']

    if (!modifiedSince) {
      return false
    }

    const project = await DIContainer.sharedContainer.projectService.getProject(projectID)

    return new Date(modifiedSince).getTime() / 1000 >= project.updatedAt
  }

  async getProjectModels(req: Request): Promise<Model[]> {
    const { projectID } = req.params
    const { types } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID should be string', projectID)
    }

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

  async updateUserRole(req: Request): Promise<void> {
    const { userID, role } = req.body
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID must be string', projectID)
    }
    if (!userID) {
      throw new ValidationError('userID must be string', userID)
    }
    if (!role) {
      throw new ValidationError('Role must be string or null', role)
    }

    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.UPDATE_ROLES)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    await DIContainer.sharedContainer.projectService.updateUserRole(projectID, userID, role)
  }

  async createManuscript(req: Request): Promise<Manuscript> {
    const { projectID, manuscriptID } = req.params
    const { templateID } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID must be string', projectID)
    }

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

  async getCollaborators(req: Request): Promise<UserCollaborator[]> {
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID must be string', projectID)
    }

    const permissions = await this.getPermissions(projectID, user._id)
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user._id)
    }

    return await DIContainer.sharedContainer.userService.getCollaborators(projectID)
  }

  async getArchive(req: Request) {
    const { projectID, manuscriptID } = req.params
    const { onlyIDs } = req.query
    const { accept } = req.headers
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID must be string', projectID)
    }
    if (manuscriptID) {
      throw new ValidationError('manuscriptID should be string', manuscriptID)
    }

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

  async generateAccessToken(req: Request): Promise<string> {
    const { projectID, scope } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID must be string', projectID)
    }
    if (!scope) {
      throw new ValidationError('scope must be string', scope)
    }

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

  async deleteProject(req: Request): Promise<void> {
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', req.user)
    }
    if (!projectID) {
      throw new ValidationError('projectID must be string', projectID)
    }

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
