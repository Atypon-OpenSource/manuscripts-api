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

import { Request, Response } from 'express'
import type {
  Client,
  ICreateDocRequest,
  IUpdateDocumentRequest,
  StepsData,
} from 'types/quarterback/doc'

import type { IReceiveStepsRequest } from '../../../../types/quarterback/collaboration'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { QuarterbackPermission } from '../../../DomainServices/Quarterback/QuarterbackService'
import { ValidationError } from '../../../Errors'
import { BaseController } from '../../BaseController'

export class DocumentController extends BaseController {
  private _documentClientsMap = new Map<string, Client[]>()
  get documentsClientsMap() {
    return this._documentClientsMap
  }
  addClient(newClient: Client, manuscriptID: string) {
    const clients = this._documentClientsMap.get(manuscriptID) || []
    clients.push(newClient)
    this.documentsClientsMap.set(manuscriptID, clients)
  }
  sendDataToClients(data: StepsData, manuscriptID: string) {
    const clientsForDocument = this.documentsClientsMap.get(manuscriptID)
    clientsForDocument?.forEach((client) => {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`)
    })
  }
  removeClientByID(clientID: number, manuscriptID: string) {
    const clients = this.documentsClientsMap.get(manuscriptID) || []
    const index = clients.findIndex((client) => client.id === clientID)
    if (index !== -1) {
      clients.splice(index, 1)
      this.documentsClientsMap.set(manuscriptID, clients)
    }
  }
  async createDocument(
    projectID: string,
    payload: ICreateDocRequest,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return await DIContainer.sharedContainer.documentService.createDocument(payload, user._id)
  }
  async getDocument(projectID: string, manuscriptID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.READ
    )

    const result = await DIContainer.sharedContainer.documentService.findDocumentWithSnapshot(
      manuscriptID
    )
    const latestDocumentHistory =
      await DIContainer.sharedContainer.documentHistoryService.findLatestDocumentHistory(
        manuscriptID
      )
    if ('data' in result && 'data' in latestDocumentHistory) {
      return {
        data: { ...result.data, version: latestDocumentHistory.data.version, doc: result.data.doc },
      }
    }
    return result
  }
  async deleteDocument(projectID: string, manuscriptID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return DIContainer.sharedContainer.documentService.deleteDocument(manuscriptID)
  }
  async updateDocument(
    projectID: string,
    manuscriptID: string,
    payload: IUpdateDocumentRequest,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return DIContainer.sharedContainer.documentService.updateDocument(manuscriptID, payload)
  }

  async receiveSteps(
    projectID: string,
    manuscriptID: string,
    payload: IReceiveStepsRequest,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.WRITE
    )
    return await DIContainer.sharedContainer.collaborationService.receiveSteps(
      manuscriptID,
      payload
    )
  }
  async listen(projectID: string, manuscriptID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.READ
    )
    return await DIContainer.sharedContainer.collaborationService.getDocumentHistory(manuscriptID)
  }

  async getStepsFromVersion(
    projectID: string,
    manuscriptID: string,
    versionID: string,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.quarterback.validateUserAccess(
      user,
      projectID,
      QuarterbackPermission.READ
    )
    return DIContainer.sharedContainer.collaborationService.getDataFromVersion(
      manuscriptID,
      versionID
    )
  }
  public manageClientConnection(req: Request, res: Response) {
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
}
