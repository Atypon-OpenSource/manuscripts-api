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
import { StatusCodes } from 'http-status-codes'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { Client, StepsData } from '../../../Models/DocumentModels'
import { celebrate } from '../../../Utilities/celebrate'
import { BaseRoute } from '../../BaseRoute'
import { DocumentController } from './DocumentController'
import {
  createDocumentSchema,
  deleteDocumentSchema,
  getDocumentSchema,
  getStepsFromVersionSchema,
  listenSchema,
  receiveStepsSchema,
  updateDocumentSchema,
} from './DocumentSchema'

export class DocumentRoute extends BaseRoute {
  private documentController = new DocumentController()
  private _documentClientsMap = new Map<string, Client[]>()
  private get basePath(): string {
    return '/doc'
  }
  private get documentsClientsMap() {
    return this._documentClientsMap
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
    router.get(
      `${this.basePath}/:projectID/manuscript/:manuscriptID/listen`,
      celebrate(listenSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.listen(req, res)
        }, next)
      }
    )
    router.get(
      `${this.basePath}/:projectID/manuscript/:manuscriptID/version/:versionID`,
      celebrate(getStepsFromVersionSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.stepsSince(req, res)
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
    res.sendStatus(StatusCodes.OK).end()
    this.sendDataToClients(result, manuscriptID)
  }
  private async listen(req: Request, res: Response) {
    const { manuscriptID, projectID } = req.params
    const user = req.user
    const result = await this.documentController.getEvents(projectID, manuscriptID, 0, user)
    const data = this.formatDataForSSE(result)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Cache-Control', 'no-cache')
    res.write(data)
    this.manageClientConnection(req, res)
  }

  private async stepsSince(req: Request, res: Response) {
    const { manuscriptID, projectID, versionID } = req.params
    const user = req.user
    const { clientIDs, steps, version } = await this.documentController.getEvents(
      projectID,
      manuscriptID,
      parseInt(versionID),
      user,
      false
    )
    res.status(StatusCodes.OK).send({ clientIDs, version, steps })
  }
  private addClient(newClient: Client, manuscriptID: string) {
    const clients = this._documentClientsMap.get(manuscriptID) || []
    clients.push(newClient)
    this.documentsClientsMap.set(manuscriptID, clients)
  }
  private sendDataToClients(data: StepsData, manuscriptID: string) {
    const clientsForDocument = this.documentsClientsMap.get(manuscriptID)
    clientsForDocument?.forEach((client) => {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`)
    })
  }
  private removeClientByID(clientID: number, manuscriptID: string) {
    const clients = this.documentsClientsMap.get(manuscriptID) || []
    const index = clients.findIndex((client) => client.id === clientID)
    if (index !== -1) {
      clients.splice(index, 1)
      this.documentsClientsMap.set(manuscriptID, clients)
    }
  }
  private manageClientConnection(req: Request, res: Response) {
    const newClient: Client = {
      id: Date.now(),
      res,
    }
    const { manuscriptID } = req.params
    this.addClient(newClient, manuscriptID)

    req.on('close', () => {
      this.removeClientByID(newClient.id, manuscriptID)
    })
  }
  private formatDataForSSE<T>(data: T) {
    return `data: ${JSON.stringify(data)}\n\n`
  }
}
