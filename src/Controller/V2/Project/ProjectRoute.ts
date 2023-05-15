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
          const project = await this.projectController.createProject(req)
          res.status(StatusCodes.OK).send(project)
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
          const manuscript = await this.projectController.updateProject(req)
          res.status(StatusCodes.OK).send(manuscript)
        }, next)
      }
    )

    router.get(
      [`${this.basePath}/:projectID`, `${this.basePath}/:projectID/manuscript/:manuscriptID?`],
      celebrate(loadProjectSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          if (await this.projectController.isProjectCacheValid(req)) {
            res.status(StatusCodes.NOT_MODIFIED).end()
          } else {
            const models = await this.projectController.getProjectModels(req)
            res.set('Content-Type', 'application/json')
            res.status(StatusCodes.OK).send(models)
          }
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
          await this.projectController.updateUserRole(req)
          res.status(StatusCodes.NO_CONTENT).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectID/manuscript/:manuscriptID?`,
      celebrate(createManuscriptSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const manuscript = await this.projectController.createManuscript(req)
          res.status(StatusCodes.OK).send(manuscript)
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
          const collaborators = await this.projectController.getCollaborators(req)
          res.status(StatusCodes.OK).send(collaborators)
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
          const archive = await this.projectController.getArchive(req)
          res.set('Content-Type', 'application/zip')
          res.status(StatusCodes.OK).send(Buffer.from(archive))
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:projectID/:scope`,
      celebrate(accessTokenSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.projectController.generateAccessToken(req))
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
          await this.projectController.deleteProject(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )
  }
}
