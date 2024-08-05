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
import { getVersion } from '@manuscripts/transform'
import { NextFunction, Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { celebrate } from '../../../Utilities/celebrate'
import { BaseRoute } from '../../BaseRoute'
import { DocumentController } from './DocumentController'
import {
  createDocumentSchema,
  deleteDocumentSchema,
  getDocumentSchema,
  receiveStepsSchema,
  stepsSinceSchema,
  updateDocumentSchema,
} from './DocumentSchema'

export class DocumentRoute extends BaseRoute {
  private documentController = new DocumentController()
  private get basePath(): string {
    return '/doc'
  }

  public create(router: Router): void {
    router.get(
      `${this.basePath}/version`,
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (_req: Request, res: Response) => {
        res.status(StatusCodes.OK).json({ transformVersion: getVersion() }).end()
      }
    )

    router.post(
      `${this.basePath}/:projectID/manuscript/:manuscriptID`,
      celebrate(createDocumentSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.createDocument(req, res)
        }, next)
      }
    )
    router.put(
      `${this.basePath}/:projectID/manuscript/:manuscriptID`,
      celebrate(updateDocumentSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.updateDocument(req, res)
        }, next)
      }
    )
    router.delete(
      `${this.basePath}/:projectID/manuscript/:manuscriptID`,
      celebrate(deleteDocumentSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.deleteDocument(req, res)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:projectID/manuscript/:manuscriptID`,
      celebrate(getDocumentSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getDocument(req, res)
        }, next)
      }
    ),
      router.get(
        `${this.basePath}/:projectID/manuscript/:manuscriptID/version/:versionID`,
        celebrate(stepsSinceSchema),
        AuthStrategy.JsonHeadersValidation,
        AuthStrategy.JWTAuth,
        (req: Request, res: Response, next: NextFunction) => {
          return this.runWithErrorHandling(async () => {
            await this.stepsSince(req, res)
          }, next)
        }
      )
    router.post(
      `${this.basePath}/:projectID/manuscript/:manuscriptID/steps`,
      celebrate(receiveStepsSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.receiveSteps(req, res)
        }, next)
      }
    )
  }

  private async createDocument(req: Request, res: Response) {
    const { projectID } = req.params
    const payload = req.body
    const user = req.user
    const doucment = await this.documentController.createDocument(projectID, payload, user)
    res.json(doucment)
  }
  private async updateDocument(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const payload = req.body
    const user = req.user
    await this.documentController.updateDocument(projectID, manuscriptID, payload, user)
    res.sendStatus(StatusCodes.OK).end()
  }
  private async getDocument(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const user = req.user
    const document = await this.documentController.getDocument(projectID, manuscriptID, user)
    res.json(document)
  }
  private async deleteDocument(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const user = req.user
    await this.documentController.deleteDocument(projectID, manuscriptID, user)
    res.sendStatus(StatusCodes.OK).end()
  }
  private async receiveSteps(req: Request, res: Response) {
    const { manuscriptID, projectID } = req.params
    const user = req.user
    const payload = req.body
    const result = await this.documentController.receiveSteps(
      projectID,
      manuscriptID,
      payload,
      user
    )
    this.documentController.broadcastSteps(manuscriptID, result)
    res.status(StatusCodes.OK).send(JSON.stringify(result))
  }

  private async stepsSince(req: Request, res: Response) {
    const { manuscriptID, projectID, versionID } = req.params
    const user = req.user
    const { clientIDs, steps, version } = await this.documentController.getEvents(
      projectID,
      manuscriptID,
      parseInt(versionID),
      user
    )
    res.status(StatusCodes.OK).send({ clientIDs, version, steps })
  }
}
