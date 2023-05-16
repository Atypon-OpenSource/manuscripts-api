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
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { ValidationError } from '../../../Errors'
import { ProjectUserRole } from '../../../Models/ContainerModels'

export async function createProjectHandler(req: Request, res: Response, next: NextFunction) {
  await this.runWithErrorHandling(async () => {
    const { title } = req.body
    const { projectID } = req.params
    const { user } = req
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const project = await this.projectController.createProject(title, projectID, user)
    res.status(StatusCodes.OK).send(project)
  }, next)
}

export async function updateProjectHandler(req: Request, res: Response, next: NextFunction) {
  await this.runWithErrorHandling(async () => {
    const { projectID } = req.params
    const { data } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID parameter must be specified', projectID)
    }
    const manuscript = await this.projectController.updateProject(projectID, data, user)
    res.status(StatusCodes.OK).send(manuscript)
  }, next)
}
export async function getProjectModelsHandler(req: Request, res: Response, next: NextFunction) {
  await this.runWithErrorHandling(async () => {
    const modifiedSince = req.headers['if-modified-since']
    const { projectID } = req.params
    if (!projectID) {
      throw new ValidationError('projectID should be string', projectID)
    }
    if (await this.projectController.isProjectCacheValid(projectID, modifiedSince)) {
      res.status(StatusCodes.NOT_MODIFIED).end()
    } else {
      const { user } = req
      if (!user) {
        throw new ValidationError('No user found', user)
      }
      const { types } = req.body
      const models = await this.projectController.getProjectModels(projectID, types, user)
      res.set('Content-Type', 'application/json')
      res.status(StatusCodes.OK).send(models)
    }
  }, next)
}
export async function updateUserRoleHandler(req: Request, res: Response, next: NextFunction) {
  await this.runWithErrorHandling(async () => {
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
    const validRoles = Object.keys(ProjectUserRole) as (keyof typeof ProjectUserRole)[]

    if (!validRoles.includes(role)) {
      throw new ValidationError('Invalid role', role)
    }
    await this.projectController.updateUserRole(projectID, userID, role, user)
    res.status(StatusCodes.NO_CONTENT).end()
  }, next)
}
export async function createManuscriptHandler(req: Request, res: Response, next: NextFunction) {
  await this.runWithErrorHandling(async () => {
    const { projectID, manuscriptID } = req.params
    const { templateID } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID must be string', projectID)
    }

    const manuscript = await this.projectController.createManuscript(
      projectID,
      manuscriptID,
      templateID,
      user
    )
    res.status(StatusCodes.OK).send(manuscript)
  }, next)
}
export async function getCollaboratorsHandler(req: Request, res: Response, next: NextFunction) {
  await this.runWithErrorHandling(async () => {
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID must be string', projectID)
    }
    const collaborators = await this.projectController.getCollaborators(projectID, user)
    res.status(StatusCodes.OK).send(collaborators)
  }, next)
}
export async function getArchiveHandler(req: Request, res: Response, next: NextFunction) {
  await this.runWithErrorHandling(async () => {
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

    const archive = await this.projectController.getArchive(
      projectID,
      manuscriptID,
      onlyIDs,
      accept,
      user
    )
    res.set('Content-Type', 'application/zip')
    res.status(StatusCodes.OK).send(Buffer.from(archive))
  }, next)
}
export async function generateAccessTokenHandler(req: Request, res: Response, next: NextFunction) {
  await this.runWithErrorHandling(async () => {
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
    res.send(await this.projectController.generateAccessToken(projectID, scope, user))
  }, next)
}
export async function deleteProjectHandler(req: Request, res: Response, next: NextFunction) {
  await this.runWithErrorHandling(async () => {
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', req.user)
    }
    if (!projectID) {
      throw new ValidationError('projectID must be string', projectID)
    }
    await this.projectController.deleteProject(projectID, user)
    res.status(StatusCodes.OK).end()
  }, next)
}
