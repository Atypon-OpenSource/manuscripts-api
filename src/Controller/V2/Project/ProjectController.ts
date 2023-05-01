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
import { MissingContainerError, ValidationError } from '../../../Errors'
import { BaseController } from '../../BaseController'

export class ProjectController extends BaseController {
  async createProject(req: Request): Promise<Project> {
    const title = req.body.title
    const projectID = req.params?.projectId
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }

    //todo check access

    return await DIContainer.sharedContainer.projectService.createProject(user, projectID, title)
  }

  async updateProject(req: Request): Promise<void> {
    const { projectId } = req.params
    const { data } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }

    //todo check access

    await DIContainer.sharedContainer.projectService.updateProject(projectId, data)
  }

  async isProjectCacheValid(req: Request): Promise<boolean> {
    const { projectId } = req.params
    const modifiedSince = req.headers['if-modified-since']

    if (!modifiedSince) {
      return false
    }
    const project = await DIContainer.sharedContainer.projectService.getProject(projectId)
    if (!project) {
      throw new MissingContainerError(project)
    }

    return new Date(modifiedSince).getTime() / 1000 >= project.updatedAt
  }

  async getProjectModels(req: Request): Promise<Model[]> {
    const { projectId } = req.params
    const { types } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectId) {
      throw new ValidationError('projectId should be string', projectId)
    }

    //todo check access

    let models = await DIContainer.sharedContainer.projectService.getProjectModels(projectId)

    if (types?.length) {
      models = models.filter((m) => types.includes(m.objectType))
    }

    return models
  }

  async updateUserRole(req: Request): Promise<void> {
    const { userId, role } = req.body
    const { projectId } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectId) {
      throw new ValidationError('projectId must be string', projectId)
    }
    if (!userId) {
      throw new ValidationError('userId must be string', userId)
    }
    if (!role) {
      throw new ValidationError('Role must be string or null', role)
    }

    //todo check access

    await DIContainer.sharedContainer.projectService.updateUserRole(projectId, userId, role)
  }

  async createManuscript(req: Request): Promise<Manuscript> {
    const { projectId, manuscriptId } = req.params
    const { templateId } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectId) {
      throw new ValidationError('projectId must be string', projectId)
    }

    //todo check access

    return await DIContainer.sharedContainer.projectService.createManuscript(
      projectId,
      manuscriptId,
      templateId
    )
  }

  async getCollaborators(req: Request): Promise<UserCollaborator[]> {
    const { projectId } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectId) {
      throw new ValidationError('projectId must be string', projectId)
    }

    //todo check access

    return await DIContainer.sharedContainer.userService.getCollaborators(projectId)
  }

  async getArchive(req: Request) {
    const { projectId, manuscriptId } = req.params
    const { onlyIDs } = req.query
    const { accept } = req.headers
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectId) {
      throw new ValidationError('projectId must be string', projectId)
    }
    if (manuscriptId) {
      throw new ValidationError('manuscriptId should be string', manuscriptId)
    }

    const options = {
      getAttachments: accept !== 'application/json',
      onlyIDs: onlyIDs === 'true',
      includeExt: true,
    }

    return await DIContainer.sharedContainer.projectService.makeArchive(
      projectId,
      manuscriptId,
      options
    )
  }

  async generateAccessToken(req: Request): Promise<string> {
    const { projectId, scope } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectId) {
      throw new ValidationError('projectId must be string', projectId)
    }
    if (!scope) {
      throw new ValidationError('scope must be string', scope)
    }

    // todo check access

    return DIContainer.sharedContainer.projectService.generateAccessToken(
      projectId,
      user._id,
      scope
    )
  }

  async deleteProject(req: Request): Promise<void> {
    const { projectId } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', req.user)
    }
    if (!projectId) {
      throw new ValidationError('projectId must be string', projectId)
    }

    //todo check access

    await DIContainer.sharedContainer.projectService.deleteProject(projectId)
  }
}
