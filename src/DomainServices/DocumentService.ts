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

import { IncomingMessage } from 'http'
import { Duplex } from 'stream'
import { ErrorEvent, MessageEvent, WebSocket, WebSocketServer } from 'ws'

import { DocumentController } from '../Controller/V2/Document/DocumentController'
import { DIContainer } from '../DIContainer/DIContainer'
import { MissingManuscriptError, RoleDoesNotPermitOperationError } from '../Errors'
import { ProjectUserRole } from '../Models/ProjectModels'
import { Snapshot } from '../Models/SnapshotModel'
import { validateToken } from '../Utilities/JWT/LoginTokenPayload'
import { log } from '../Utilities/Logger'
import { SocketsService } from './SocketsService'

export enum DocumentPermission {
  READ,
  WRITE,
}

export interface SnapshotLabelResult {
  id: string
  name: string
  createdAt: number
}
const EMPTY_PERMISSIONS = new Set<DocumentPermission>()
export class DocumentService {
  constructor(private readonly socketsService: SocketsService) {}
  private documentController = new DocumentController()

  async getPermissions(
    projectID: string,
    userID: string
  ): Promise<ReadonlySet<DocumentPermission>> {
    const project = await DIContainer.sharedContainer.projectService.getProject(projectID)
    const role = DIContainer.sharedContainer.projectService.getUserRole(project, userID)
    switch (role) {
      case ProjectUserRole.Owner:
      case ProjectUserRole.Writer:
      case ProjectUserRole.Editor:
      case ProjectUserRole.Annotator:
      case ProjectUserRole.Proofer:
        return new Set([DocumentPermission.READ, DocumentPermission.WRITE])
      case ProjectUserRole.Viewer:
        return new Set([DocumentPermission.READ])
    }
    return EMPTY_PERMISSIONS
  }

  public async validateUserAccess(
    userID: string,
    projectID: string,
    permission: DocumentPermission
  ) {
    const permissions = await this.getPermissions(projectID, userID)
    if (!permissions.has(permission)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, userID)
    }
  }

  public async validateTokenAccess(
    token: string,
    projectID: string,
    permission: DocumentPermission
  ) {
    const { userID } = validateToken(token)
    await this.validateUserAccess(userID, projectID, permission)
  }

  public async getManuscriptFromSnapshot(snapshot: Snapshot) {
    const manuscriptID = snapshot.doc_id
    const manuscript = await DIContainer.sharedContainer.projectClient.getProject(manuscriptID)

    if (!manuscript) {
      throw new MissingManuscriptError(manuscriptID)
    }
    return manuscript
  }

  public async handleUpgrade(
    wss: WebSocketServer,
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) {
    const url = request.url
    if (!url) {
      this.destroyStream(socket)
      return
    }

    const { manuscriptID, projectID } = this.parseConnectionURL(url)
    if (!manuscriptID || !projectID) {
      this.destroyStream(socket)
      return
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      this.attachListeners(socket, ws, manuscriptID)
      this.socketsService.addClient(manuscriptID, ws)
      log.info(`added client for manuscript ${manuscriptID}`)
      wss.emit('connection', ws, request)
    })
  }
  private parseConnectionURL(url: string) {
    const urlRegex =
      /^\/api\/v2\/doc\/(MPProject:[0-9a-fA-F-]+)\/manuscript\/(MPManuscript:[0-9a-fA-F-]+)\/listen/
    const match = url.match(urlRegex)
    return {
      projectID: match ? match[1] : undefined,
      manuscriptID: match ? match[2] : undefined,
    }
  }
  private attachListeners(_stream: Duplex, ws: WebSocket, manuscriptID: string) {
    ws.onerror = (error) => this.onError(ws, error)
    ws.onclose = () => this.onClose(ws, manuscriptID)
    ws.onmessage = (event: MessageEvent) => {
      this.onMessage(ws, event).catch((error) => {
        console.error('Unhandled error in WebSocket message handler', error)
      })
    }
  }

  private onError(ws: WebSocket, error: ErrorEvent) {
    log.error(`webSocket error: ${error}`)
    this.closeSocket(ws)
  }
  private onClose = (ws: WebSocket, manuscriptID: string) => {
    log.info(`connection closed for ${manuscriptID}`)
    this.closeSocket(ws, manuscriptID)
  }
  private async onMessage(ws: WebSocket, event: MessageEvent): Promise<void> {
    try {
      // Parse message data (ensure it conforms to your expected structure)
      const { projectID, manuscriptID, payload, token } = JSON.parse(event.data as string)
      const valid = validateToken(token)
      const user = await DIContainer.sharedContainer.userClient.findByID(valid.userID)

      const result = await this.documentController.processSteps({
        projectID,
        manuscriptID,
        payload,
        user,
      })

      ws.send(JSON.stringify({ status: 'success', result }))
    } catch (error) {
      console.error('Error processing WebSocket message:', error)
      ws.send(
        JSON.stringify({
          status: 'error',
          InternalErrorCode: error.internalErrorCode,
          message: error.message,
        })
      )
    }
  }

  private closeSocket(ws: WebSocket, manuscriptID?: string) {
    try {
      ws.removeAllListeners()
      ws.close()
    } catch (error) {
      log.error(`error closing socket: ${error}`)
    }
    if (manuscriptID) {
      this.socketsService.removeClient(manuscriptID, ws)
      log.info(`removed client for manuscript ${manuscriptID}`)
    }
  }

  private destroyStream(stream: Duplex) {
    try {
      stream.destroy()
    } catch (error) {
      log.error(`error destroying duplex: ${error}`)
    }
  }
}
