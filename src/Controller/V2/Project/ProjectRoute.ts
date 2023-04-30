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
  manageUserRoleSchema,
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
      `${this.basePath}/:projectId?`,
      celebrate(createProjectSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const project = await this.projectController.create(req)
          res.status(StatusCodes.OK).send(project)
        }, next)
      }
    )
    router.put(
      `${this.basePath}/:projectId`,
      celebrate(saveProjectSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const manuscript = await this.projectController.saveProject(req)
          res.status(StatusCodes.OK).send(manuscript)
        }, next)
      }
    )

    router.get(
      [`${this.basePath}/:projectId`, `${this.basePath}/:projectId/manuscript/:manuscriptId?`],
      celebrate(loadProjectSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const { data, status } = await this.projectController.loadProject(req)
          if (status === StatusCodes.OK) {
            res.set('Content-Type', 'application/json')
            res.status(status).send(data)
          } else {
            res.status(status).end()
          }
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectId/roles`,
      celebrate(manageUserRoleSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.projectController.manageUserRole(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectId/users`,
      celebrate(addUserSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.projectController.addUser(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectId/manuscript/:manuscriptId?`,
      celebrate(createManuscriptSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.projectController.createManuscript(req))
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:projectId/collaborators`,
      celebrate(projectCollaboratorsSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const collaborators = await this.projectController.collaborators(req)
          res.status(StatusCodes.OK).send(collaborators)
        }, next)
      }
    )

    router.get(
      [
        `${this.basePath}/:projectId/archive`,
        `${this.basePath}/:projectId/manuscript/:manuscriptId/archive`,
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
      `${this.basePath}/:scope.jwks`,
      celebrate(accessTokenSchema, {}),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(this.projectController.jwksForAccessScope(req))
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:projectId/:scope`,
      celebrate(accessTokenSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.projectController.accessToken(req))
        }, next)
      }
    )

    router.delete(
      `${this.basePath}/:projectId`,
      celebrate(deleteSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.projectController.delete(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )
  }
}
