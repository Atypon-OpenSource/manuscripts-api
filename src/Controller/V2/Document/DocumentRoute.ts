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

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { BaseRoute } from '../../BaseRoute'
import { DocumentController } from './DocumentController'
import { createDocumentSchema, deleteDocumentSchema, getDocumentSchema } from './DocumentSchema'

export class DocumentRoute extends BaseRoute {
  private documentController = new DocumentController()

  private get basePath(): string {
    return '/doc'
  }

  public create(router: Router): void {
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
      celebrate(createDocumentSchema),
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
    )
  }

  private async createDocument(req: Request, res: Response) {
    const { projectID } = req.params
    const payload = req.body
    const user = req.user
    const result = await this.documentController.createDocument(projectID, payload, user)
    if ('err' in result && 'code' in result) {
      res.status(result.code).send(result.err)
    } else {
      res.json(result.data)
    }
  }
  private async updateDocument(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const { doc } = req.body
    const user = req.user
    const result = await this.documentController.updateDocument(projectID, manuscriptID, doc, user)
    if ('err' in result && 'code' in result) {
      res.status(result.code).send(result.err)
    } else {
      res.status(200)
    }
  }
  private async getDocument(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const user = req.user
    const result = await this.documentController.getDocument(projectID, manuscriptID, user)
    if ('err' in result && 'code' in result) {
      res.status(result.code).send(result.err)
    } else {
      res.json(result.data)
    }
  }
  private async deleteDocument(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const user = req.user
    const result = await this.documentController.deleteDocument(projectID, manuscriptID, user)
    if ('err' in result && 'code' in result) {
      res.status(result.code).send(result.err)
    } else {
      res.status(200)
    }
  }
}
