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

import { BaseRoute } from '../../BaseRoute'
import {
  createSchema,
  manageUserRoleSchema,
  addUserSchema,
  getArchiveSchema,
  accessTokenSchema,
  accessTokenJWKSchema,
  getPickerBuilderSchema, getProductionNotesSchema, addProductionNoteSchema
} from './ContainerSchema'
import { ContainersController } from './ContainersController'
import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'

export class ContainerRoute extends BaseRoute {
  private containersController = new ContainersController()

  public create (router: Router): void {
    router.post(
      `/:containerType/create`,
      expressJoiMiddleware(createSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containersController.create(req)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )

    router.get(
      [`/:containerID/archive`, `/:containerID/:manuscriptID/archive`],
      expressJoiMiddleware(getArchiveSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const archive = await this.containersController.getArchive(req)
          res.set('Content-Type', 'application/zip')
          res.status(HttpStatus.OK).send(archive)
        }, next)
      }
    )

    router.get(
      `/:containerType/attachment/:id/:attachmentKey?`,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const attachment = await this.containersController.getAttachment(req)
          res.set('Content-Type', attachment.contentType)
          res.status(HttpStatus.OK).send(attachment.body)
        }, next)
      }
    )

    router.post(
      [`/:containerID/roles`, `/project/:containerID/roles`],
      expressJoiMiddleware(manageUserRoleSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containersController.manageUserRole(req)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )

    router.post(
      [`/:containerID/addUser`, `/project/:containerID/addUser`],
      expressJoiMiddleware(addUserSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containersController.addUser(req)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )

    // Deprecated, moved to .well-known
    router.get(
      `/:containerType/:scope.jwks`,
      expressJoiMiddleware(accessTokenJWKSchema, {}),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(this.containersController.jwksForAccessScope(req))
        }, next)
      }
    )

    router.get(
      `/picker-bundle/:containerID/:manuscriptID`,
      expressJoiMiddleware(getPickerBuilderSchema, {}),
      AuthStrategy.scopedJWTAuth('file-picker'),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.containersController.getBundle(req, (zipFile: any) => {
            res.set('Content-Type', 'application/zip')
            res.status(HttpStatus.OK).send(zipFile)
          })
        }, next)
      }
    )

    router.get(
      `/:containerType/:containerID/:scope`,
      expressJoiMiddleware(accessTokenSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.containersController.accessToken(req))
        }, next)
      }
    )

    router.get(
      `/projects/:containerID/manuscripts/:manuscriptID/notes`,
      expressJoiMiddleware(getProductionNotesSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.containersController.getProductionNotes(req))
        }, next)
      }
    )

    router.post(
      `/projects/:containerID/manuscripts/:manuscriptID/notes`,
      expressJoiMiddleware(addProductionNoteSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.containersController.addProductionNote(req))
        }, next)
      }
    )
  }
}
