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
import multer from 'multer'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { BaseRoute } from '../../BaseRoute'
import { ProjectController } from './ProjectController'
import {
  accessTokenJWKSchema,
  accessTokenSchema,
  addProductionNoteSchema,
  addSchema,
  addUserSchema,
  createContainerSchema,
  createManuscriptSchema,
  createProjectSchema,
  deleteModelSchema,
  deleteSchema,
  getArchiveSchema,
  getPickerBuilderSchema,
  getProductionNotesSchema,
  loadProjectSchema,
  manageUserRoleSchema,
  projectCollaboratorsSchema,
  replaceProjectSchema,
  saveProjectSchema,
} from './ProjectSchema'
export class ProjectRoute extends BaseRoute {
  private projectController = new ProjectController()

  private get basePath(): string {
    return '/project'
  }
  public create(router: Router): void {
    router.post(
      `${this.basePath}/:containerType?`,
      (req: Request, res: Response, next: NextFunction) => {
        const schemaToUse = !req.params.containerType ? createProjectSchema : createContainerSchema
        celebrate(schemaToUse)(req, res, next)
      },
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const project = await this.projectController.create(req)
          res.status(StatusCodes.OK).send(project)
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectId/add`,
      celebrate(addSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      multer({ dest: `/tmp` }).single('file'),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const manuscript = await this.projectController.add(req)

          res.status(StatusCodes.OK).send(manuscript)
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:projectId/save`,
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

    router.post(
      `${this.basePath}/:projectId/manuscripts/:manuscriptId/replace`,
      celebrate(replaceProjectSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const manuscript = await this.projectController.projectReplace(req)
          res.status(StatusCodes.OK).send(manuscript)
        }, next)
      }
    )

    router.post(
      [`${this.basePath}/:projectId/load`, `${this.basePath}/:projectId/:manuscriptId/load`],
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
      `${this.basePath}/:containerID/roles`,
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
      `${this.basePath}/:containerID/addUser`,
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
      `${this.basePath}/projects/:containerID/manuscripts/:manuscriptID?`,
      celebrate(createManuscriptSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.projectController.createManuscript(req))
        }, next)
      }
    )

    router.post(
      `${this.basePath}/projects/:containerID/manuscripts/:manuscriptID/notes`,
      celebrate(addProductionNoteSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.projectController.addProductionNote(req))
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
        `${this.basePath}/:containerID/archive`,
        `${this.basePath}/:containerID/:manuscriptID/archive`,
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
      `${this.basePath}/:containerType/attachment/:id/:attachmentKey?`,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const attachment = await this.projectController.getAttachment(req)
          res.set('Content-Type', attachment.contentType)
          res.status(StatusCodes.OK).send(attachment.body)
        }, next)
      }
    )
    router.get(
      `${this.basePath}/:containerType/:scope.jwks`,
      celebrate(accessTokenJWKSchema, {}),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(this.projectController.jwksForAccessScope(req))
        }, next)
      }
    )

    router.get(
      `${this.basePath}/picker-bundle/:containerID/:manuscriptID`,
      celebrate(getPickerBuilderSchema, {}),
      AuthStrategy.scopedJWTAuth('file-picker'),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.projectController.getBundle(req, (zipFile: any) => {
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
          res.send(await this.projectController.accessToken(req))
        }, next)
      }
    )

    router.get(
      `${this.basePath}/projects/:containerID/manuscripts/:manuscriptID/notes`,
      celebrate(getProductionNotesSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          res.send(await this.projectController.getProductionNotes(req))
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
          await this.projectController.delete(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )
    router.delete(
      `${this.basePath}/:projectId/manuscripts/:manuscriptId/model/:modelId`,
      celebrate(deleteModelSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.projectController.deleteModel(req)
          res.status(StatusCodes.OK).end()
        }, next)
      }
    )
  }
}
