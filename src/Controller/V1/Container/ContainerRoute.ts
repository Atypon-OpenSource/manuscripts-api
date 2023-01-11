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

import { celebrate } from 'celebrate'
import { NextFunction, Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { BaseRoute } from '../../BaseRoute'
import {
  accessTokenJWKSchema,
  accessTokenSchema,
  addProductionNoteSchema,
  addUserSchema,
  createManuscriptSchema,
  createSchema,
  deleteSchema,
  getArchiveSchema,
  getPickerBuilderSchema,
  getProductionNotesSchema,
  loadProjectSchema,
  manageUserRoleSchema,
} from './ContainerSchema'
import { ContainersController } from './ContainersController'

export class ContainerRoute extends BaseRoute {
  private containersController = new ContainersController()

  /**
   * Returns project route base path.
   *
   * @returns string
   */
  private get basePath(): string {
    return '/container'
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}/:containerType/create`,
      celebrate(createSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containersController.create(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )

    router.delete(
      [`${this.basePath}/:containerID`, `${this.basePath}/:containerType/:containerID`],
      celebrate(deleteSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containersController.delete(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )

    router.post(
      [`${this.basePath}/:projectId/load`, `${this.basePath}/:projectId/:manuscriptId/load`],
      celebrate(loadProjectSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const { data, status } = await this.containersController.loadProject(req)
          if (status === StatusCodes.OK) {
            res.set('Content-Type', 'application/json')
            res.status(status).send(data)
          } else {
            res.status(status).end()
          }
        }, next)
      }
    )

    router.get(
      [
        `${this.basePath}/:containerID/archive`,
        `${this.basePath}/:containerID/:manuscriptID/archive`,
      ],
      celebrate(getArchiveSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const archive = await this.containersController.getArchive(req)
          res.set('Content-Type', 'application/zip')
          res.status(StatusCodes.OK).send(archive)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:containerType/attachment/:id/:attachmentKey?`,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const attachment = await this.containersController.getAttachment(req)
          res.set('Content-Type', attachment.contentType)
          res.status(StatusCodes.OK).send(attachment.body)
        }, next)
      }
    )

    router.post(
      [`${this.basePath}/:containerID/roles`, `${this.basePath}/project/:containerID/roles`],
      celebrate(manageUserRoleSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containersController.manageUserRole(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )

    router.post(
      [`${this.basePath}/:containerID/addUser`, `${this.basePath}/project/:containerID/addUser`],
      celebrate(addUserSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containersController.addUser(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )

    // Deprecated, moved to .well-known
    router.get(
      `${this.basePath}/:containerType/:scope.jwks`,
      celebrate(accessTokenJWKSchema, {}),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(this.containersController.jwksForAccessScope(req))
        }, next)
      }
    )

    router.get(
      `${this.basePath}/picker-bundle/:containerID/:manuscriptID`,
      celebrate(getPickerBuilderSchema, {}),
      AuthStrategy.scopedJWTAuth('file-picker'),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containersController.getBundle(req, (zipFile: any) => {
            res.set('Content-Type', 'application/zip')
            res.status(StatusCodes.OK).send(zipFile)
          })
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:containerType/:containerID/:scope`,
      celebrate(accessTokenSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.containersController.accessToken(req))
        }, next)
      }
    )

    router.post(
      `${this.basePath}/projects/:containerID/manuscripts/:manuscriptID?`,
      celebrate(createManuscriptSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.containersController.createManuscript(req))
        }, next)
      }
    )

    router.get(
      `${this.basePath}/projects/:containerID/manuscripts/:manuscriptID/notes`,
      celebrate(getProductionNotesSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.containersController.getProductionNotes(req))
        }, next)
      }
    )

    router.post(
      `${this.basePath}/projects/:containerID/manuscripts/:manuscriptID/notes`,
      celebrate(addProductionNoteSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.containersController.addProductionNote(req))
        }, next)
      }
    )
  }
}
