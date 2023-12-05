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

import type { Client, StepsData } from '../../../../types/quarterback/doc'
import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { BaseRoute } from '../../BaseRoute'
import { queueRequests } from '../RequestQueue'
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
  get documentsClientsMap() {
    return this._documentClientsMap
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
            await queueRequests(req, res, this.receiveSteps.bind(this))
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
          await queueRequests(req, res, this.listen.bind(this))
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
          await queueRequests(req, res, this.getStepFromVersion.bind(this))
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
    const payload = req.body
    const user = req.user
    const result = await this.documentController.updateDocument(
      projectID,
      manuscriptID,
      payload,
      user
    )
    if ('err' in result && 'code' in result) {
      res.status(result.code).send(result.err)
    } else {
      res.status(StatusCodes.OK).end()
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
      res.status(StatusCodes.OK).end()
    }
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
    if ('err' in result && 'code' in result) {
      res.status(result.code).send(result.err)
    } else {
      res.status(StatusCodes.OK).end()
      this.sendDataToClients(
        {
          steps: result.data.steps,
          clientIDs: result.data.clientIDs,
          version: result.data.version,
        },
        manuscriptID
      )
    }
  }
  private async listen(req: Request, res: Response) {
    const { manuscriptID, projectID } = req.params
    const user = req.user
    const result = await this.documentController.getDocumentHistory(projectID, manuscriptID, user)
    if ('err' in result && 'code' in result) {
      res.status(result.code).send(result.err)
    } else {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('Cache-Control', 'no-cache')
      const data = `data: ${JSON.stringify(result.data)}\n\n`
      res.write(data)
      this.manageClientConnection(req, res)
    }
  }

  private async getStepFromVersion(req: Request, res: Response) {
    const { manuscriptID, projectID, versionID } = req.params
    const user = req.user
    const result = await this.documentController.getStepsFromVersion(
      projectID,
      manuscriptID,
      versionID,
      user
    )
    if ('err' in result && 'code' in result) {
      res.status(result.code).send(result.err)
    } else {
      res.status(StatusCodes.OK).send(result.data)
    }
  }
}
