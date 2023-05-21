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

import { celebrate } from 'celebrate'
import { NextFunction, Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { ValidationError } from '../../../Errors'
import { ProjectUserRole } from '../../../Models/ContainerModels'
import { isString } from '../../../util'
import { BaseRoute } from '../../BaseRoute'
import { ProjectController } from './ProjectController'
import {
  accessTokenSchema,
  addUserSchema,
  createManuscriptSchema,
  createProjectSchema,
  deleteSchema,
  getArchiveSchema,
  loadProjectSchema,
  projectCollaboratorsSchema,
  saveProjectSchema,
} from './ProjectSchema'

export class ProjectRoute extends BaseRoute {
  // @ts-ignore
  private projectController = new ProjectController()

  private get basePath(): string {
    return '/project'
  }
  public create(router: Router): void {
    router.post(
      `${this.basePath}/:projectID?`,
      celebrate(createProjectSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.createProjectHandler(req, res)
        }, next)
      }
    )
    router.put(
      `${this.basePath}/:projectID`,
      celebrate(saveProjectSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.updateProjectHandler(req, res)
        }, next)
      }
    )

    router.get(
      [`${this.basePath}/:projectID`, `${this.basePath}/:projectID/manuscript/:manuscriptID?`],
      celebrate(loadProjectSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getProjectModelsHandler(req, res)
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectID/users`,
      celebrate(addUserSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.updateUserRoleHandler(req, res)
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectID/manuscript/:manuscriptID?`,
      celebrate(createManuscriptSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.createManuscriptHandler(req, res)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:projectID/collaborators`,
      celebrate(projectCollaboratorsSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getCollaboratorsHandler(req, res)
        }, next)
      }
    )

    router.get(
      [
        `${this.basePath}/:projectID/archive`,
        `${this.basePath}/:projectID/manuscript/:manuscriptID/archive`,
      ],
      celebrate(getArchiveSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getArchiveHandler(req, res)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:projectID/:scope`,
      celebrate(accessTokenSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.generateAccessTokenHandler(req, res)
        }, next)
      }
    )

    router.delete(
      `${this.basePath}/:projectID`,
      celebrate(deleteSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.deleteProjectHandler(req, res)
        }, next)
      }
    )
  }
  private async createProjectHandler(req: Request, res: Response) {
    const { title } = req.body
    const { projectID } = req.params
    const { user } = req
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const project = await this.projectController.createProject(title, user, projectID)
    res.status(StatusCodes.OK).send(project)
  }
  private async updateProjectHandler(req: Request, res: Response) {
    const { projectID } = req.params
    const { data } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID parameter must be specified', projectID)
    }
    const manuscript = await this.projectController.updateProject(data, user, projectID)
    res.status(StatusCodes.OK).send(manuscript)
  }
  private async getProjectModelsHandler(req: Request, res: Response) {
    const modifiedSince = req.headers['if-modified-since']
    const { projectID } = req.params
    if (!projectID) {
      throw new ValidationError('projectID parameter must be specified', projectID)
    }
    if (await this.projectController.isProjectCacheValid(projectID, modifiedSince)) {
      res.status(StatusCodes.NOT_MODIFIED).end()
    } else {
      const { user } = req
      if (!user) {
        throw new ValidationError('No user found', user)
      }
      const { types } = req.body
      const models = await this.projectController.getProjectModels(types, user, projectID)
      res.set('Content-Type', 'application/json')
      res.status(StatusCodes.OK).send(models)
    }
  }
  private async updateUserRoleHandler(req: Request, res: Response) {
    const { userID, role } = req.body
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID parameter must be specified', projectID)
    }
    if (!userID) {
      throw new ValidationError('userID parameter must be specified', userID)
    }
    if (!role) {
      throw new ValidationError('Role must be string or null', role)
    }
    const validRoles = Object.keys(ProjectUserRole) as (keyof typeof ProjectUserRole)[]

    if (!validRoles.includes(role)) {
      throw new ValidationError('Invalid role', role)
    }
    await this.projectController.updateUserRole(userID, role, user, projectID)
    res.status(StatusCodes.NO_CONTENT).end()
  }
  private async createManuscriptHandler(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const { templateID } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID parameter must be specified', projectID)
    }

    const manuscript = await this.projectController.createManuscript(
      user,
      projectID,
      manuscriptID,
      templateID
    )
    res.status(StatusCodes.OK).send(manuscript)
  }
  private async getCollaboratorsHandler(req: Request, res: Response) {
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID parameter must be specified', projectID)
    }
    const collaborators = await this.projectController.getCollaborators(user, projectID)
    res.status(StatusCodes.OK).send(collaborators)
  }
  private async getArchiveHandler(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const { onlyIDs } = req.query
    const { accept } = req.headers
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID parameter must be specified', projectID)
    }
    if (manuscriptID && !isString(manuscriptID)) {
      throw new ValidationError('manuscriptID parameter must be specified', manuscriptID)
    }

    const archive = await this.projectController.getArchive(
      onlyIDs,
      accept,
      user,
      projectID,
      manuscriptID
    )
    res.set('Content-Type', 'application/zip')
    res.status(StatusCodes.OK).send(Buffer.from(archive))
  }
  private async generateAccessTokenHandler(req: Request, res: Response) {
    const { projectID, scope } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    if (!projectID) {
      throw new ValidationError('projectID parameter must be specified', projectID)
    }
    if (!scope) {
      throw new ValidationError('scope parameter must be specified', scope)
    }
    res.send(await this.projectController.generateAccessToken(scope, user, projectID))
  }
  private async deleteProjectHandler(req: Request, res: Response) {
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', req.user)
    }
    if (!projectID) {
      throw new ValidationError('projectID parameter must be specified', projectID)
    }
    await this.projectController.deleteProject(projectID, user)
    res.status(StatusCodes.OK).end()
  }
}
