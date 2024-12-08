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

import { NextFunction, Request, Response, Router } from 'express'
import { remove } from 'fs-extra'
import { StatusCodes } from 'http-status-codes'
import multer from 'multer'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { ValidationError } from '../../../Errors'
import { ProjectUserRole } from '../../../Models/ProjectModels'
import { celebrate } from '../../../Utilities/celebrate'
import { BaseRoute } from '../../BaseRoute'
import { ProjectController } from './ProjectController'
import {
  addUserSchema,
  createManuscriptSchema,
  createProjectSchema,
  deleteSchema,
  exportJatsSchema,
  getArchiveSchema,
  loadManuscriptSchema,
  loadProjectSchema,
  projectUserProfilesSchema,
  revokeUserPermissions,
  saveProjectSchema,
  updateManuscriptDoiSchema,
} from './ProjectSchema'

export class ProjectRoute extends BaseRoute {
  private projectController = new ProjectController()

  private get basePath(): string {
    return '/project'
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}`,
      celebrate(createProjectSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.createProject(req, res)
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
          await this.updateProject(req, res)
        }, next)
      }
    )
    router.get(
      `${this.basePath}/:projectID`,
      celebrate(loadProjectSchema),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getProjectModels(req, res)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:projectID/manuscript/:manuscriptID`,
      celebrate(loadManuscriptSchema),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getManuscriptModels(req, res)
        }, next)
      }
    )

    router.put(
      `${this.basePath}/:projectID/manuscript/:manuscriptID`,
      celebrate(updateManuscriptDoiSchema),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.updateManuscriptDoi(req, res)
        }, next)
      }
    )
    router.post(
      `${this.basePath}/:projectID/users`,
      celebrate(addUserSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.updateUserRole(req, res)
        }, next)
      }
    )
    router.delete(
      `${this.basePath}/:projectID/users`,
      celebrate(revokeUserPermissions),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.revokeUserPermissions(req, res)
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectID/manuscript`,
      celebrate(createManuscriptSchema),
      AuthStrategy.JWTAuth,
      multer({ dest: `/tmp` }).single('file'),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          if (req.file && !req.body.templateID) {
            throw new ValidationError('template ID is required', req.body.templateID)
          }
          await this.createManuscript(req, res)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:projectID/userProfiles`,
      celebrate(projectUserProfilesSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getProjectUserProfiles(req, res)
        }, next)
      }
    )

    router.get(
      [
        `${this.basePath}/:projectID/archive`,
        `${this.basePath}/:projectID/manuscript/:manuscriptID/archive`,
      ],
      celebrate(getArchiveSchema),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getArchive(req, res)
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectID/manuscript/:manuscriptID/export-jats`,
      celebrate(exportJatsSchema),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.exportJats(req, res)
        }, next)
      }
    )

    router.delete(
      `${this.basePath}/:projectID`,
      celebrate(deleteSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.deleteProject(req, res)
        }, next)
      }
    )
  }

  private async createProject(req: Request, res: Response) {
    const { title } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const project = await this.projectController.createProject(title, user)
    res.status(StatusCodes.OK).send(project)
  }

  private async updateProject(req: Request, res: Response) {
    const { projectID } = req.params
    const { data } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const manuscript = await this.projectController.updateProject(data, user, projectID)
    res.status(StatusCodes.OK).send(manuscript)
  }

  private async getProjectModels(req: Request, res: Response) {
    const modifiedSince = req.headers['if-modified-since']
    const { projectID } = req.params
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

  private async updateManuscriptDoi(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const { doi } = req.body
    const { user } = req
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await this.projectController.updateManuscript(user, projectID, manuscriptID, doi)
    res.status(StatusCodes.NO_CONTENT).end()
  }

  private async getManuscriptModels(req: Request, res: Response) {
    const modifiedSince = req.headers['if-modified-since']
    const { projectID } = req.params
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

  private async updateUserRole(req: Request, res: Response) {
    const { userID, role } = req.body
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }

    if (!Object.values(ProjectUserRole).includes(role)) {
      throw new ValidationError('Invalid role', role)
    }

    await this.projectController.updateUserRole(userID, user, projectID, role)
    res.status(StatusCodes.NO_CONTENT).end()
  }

  private async revokeUserPermissions(req: Request, res: Response) {
    const { userID } = req.body
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await this.projectController.updateUserRole(userID, user, projectID)
    res.status(StatusCodes.NO_CONTENT).end()
  }

  private async createManuscript(req: Request, res: Response) {
    const file = req.file
    const { projectID } = req.params
    const { templateID } = req.body
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }

    let manuscript
    if (file && file.path) {
      manuscript = await this.projectController.importJats(user, file, projectID, templateID)
      await remove(file.path)
    } else {
      manuscript = await this.projectController.createArticleNode(user, projectID, templateID)
    }

    res.status(StatusCodes.OK).send(manuscript)
  }

  private async getProjectUserProfiles(req: Request, res: Response) {
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const userProfiles = await this.projectController.getUserProfiles(user, projectID)
    res.status(StatusCodes.OK).send(userProfiles)
  }

  private async exportJats(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }

    const jats = await this.projectController.exportJats(projectID, manuscriptID, user)
    res.status(StatusCodes.OK).type('application/xml').send(jats)
  }
  private async getArchive(req: Request, res: Response) {
    const { projectID } = req.params
    const { onlyIDs } = req.query
    const { accept } = req.headers
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', user)
    }

    const archive = await this.projectController.getArchive(onlyIDs, accept, user, projectID)
    if (accept !== 'application/json') {
      res.set('Content-Type', 'application/zip')
    } else {
      res.set('Content-Type', 'application/json')
    }
    res.status(StatusCodes.OK).send(Buffer.from(archive))
  }

  private async deleteProject(req: Request, res: Response) {
    const { projectID } = req.params
    const { user } = req

    if (!user) {
      throw new ValidationError('No user found', req.user)
    }
    await this.projectController.deleteProject(projectID, user)
    res.status(StatusCodes.NO_CONTENT).end()
  }
}
