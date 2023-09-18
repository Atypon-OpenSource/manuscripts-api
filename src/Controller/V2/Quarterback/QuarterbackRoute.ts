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
import { QuarterbackController } from './QuarterbackController'
import {
  createDocumentSchema,
  createSnapshotSchema,
  deleteDocumentSchema,
  deleteSnapshotSchema,
  getDocOfVersionSchema,
  getDocumentSchema,
  getSnapshotLabelsSchema,
  getSnapshotSchema,
  listenSchema,
  receiveStepsSchema,
  updateDocumentSchema,
} from './QuarterbackSchema'

export class QuarterbackRoute extends BaseRoute {
  private quarterbackController = new QuarterbackController()

  private get basePath(): string {
    return `/quarterback`
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}/doc/:projectID/manuscript/:manuscriptID`,
      celebrate(createDocumentSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.createDocument(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )

    router.put(
      `${this.basePath}/doc/:projectID/manuscript/:manuscriptID`,
      celebrate(updateDocumentSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.updateDocument(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )
    router.delete(
      `${this.basePath}/doc/:projectID/manuscript/:manuscriptID`,
      celebrate(deleteDocumentSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.deleteDocument(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/doc/:projectID/manuscript/:manuscriptID`,
      celebrate(getDocumentSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.getDocument(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )
    router.post(
      `${this.basePath}/doc/:projectID/manuscript/:manuscriptID/steps`,
      celebrate(receiveStepsSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.receiveSteps(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )
    router.get(
      `${this.basePath}/doc/:projectID/manuscript/:manuscriptID/listen`,
      celebrate(listenSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.handleSteps(req)
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Cache-Control', 'no-cache')
          res.status(StatusCodes.OK).write(result)
        }, next)
      }
    )
    router.get(
      `${this.basePath}/doc/:projectID/manuscript/:manuscriptID/version`,
      celebrate(getDocOfVersionSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.getDocOfVersion(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )

    router.post(
      `${this.basePath}/snapshot/:projectID/manuscript/:manuscriptID`,
      celebrate(createSnapshotSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.createSnapshot(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )

    router.delete(
      `${this.basePath}/snapshot/:snapshotID`,
      celebrate(deleteSnapshotSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.deleteSnapshot(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/snapshot/:snapshotID`,
      celebrate(getSnapshotSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.getSnapshot(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/snapshot/:projectID/manuscript/:manuscriptID/labels`,
      celebrate(getSnapshotLabelsSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.quarterbackController.getSnapshotLabels(req)
          res.status(StatusCodes.OK).send(result)
        }, next)
      }
    )
  }
}
