/*!
 * © 2020 Atypon Systems LLC
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

const expressJoiMiddleware = require('express-joi-middleware')
import { NextFunction, Request, Response, Router } from 'express'
import * as HttpStatus from 'http-status-codes'
import multer from 'multer'

import { BaseRoute } from '../../BaseRoute'
import { ProjectController } from './ProjectController'
import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import {
  addSchema,
  createSchema,
  saveProjectSchema,
  projectCollaboratorsSchema,
  replaceProjectSchema,
} from './ProjectSchema'

export class ProjectRoute extends BaseRoute {
  private projectController = new ProjectController()

  /**
   * Returns project route base path.
   *
   * @returns string
   */
  private get basePath(): string {
    return '/project'
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}`,
      expressJoiMiddleware(createSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const project = await this.projectController.create(req)

          res.status(HttpStatus.OK).send(project)
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectId`,
      expressJoiMiddleware(addSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      multer({ dest: `/tmp` }).single('file'),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const manuscript = await this.projectController.add(req)

          res.status(HttpStatus.OK).send(manuscript)
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectId/save`,
      expressJoiMiddleware(saveProjectSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const manuscript = await this.projectController.saveProject(req)
          res.status(HttpStatus.OK).send(manuscript)
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectId/manuscripts/:manuscriptId/save`,
      expressJoiMiddleware(replaceProjectSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const manuscript = await this.projectController.projectReplace(req)
          res.status(HttpStatus.OK).send(manuscript)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:projectId/collaborators`,
      expressJoiMiddleware(projectCollaboratorsSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const collaborators = await this.projectController.collaborators(req)
          res.status(HttpStatus.OK).send(collaborators)
        }, next)
      }
    )
  }
}
