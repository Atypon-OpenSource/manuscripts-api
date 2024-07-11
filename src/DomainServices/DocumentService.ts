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

import { Manuscript } from '@manuscripts/json-schema'
import { getVersion } from '@manuscripts/transform'
import { IncomingMessage } from 'http'
import { Duplex } from 'stream'
import { ErrorEvent, MessageEvent, WebSocket, WebSocketServer } from 'ws'

import { validateListenUrl } from '../Controller/V2/Document/DocumentSchema'
import { DIContainer } from '../DIContainer/DIContainer'
import {
  MissingManuscriptError,
  RoleDoesNotPermitOperationError,
  VersionMismatchError,
} from '../Errors'
import { ReceiveSteps } from '../Models/AuthorityModels'
import { ProjectUserRole } from '../Models/ProjectModels'
import { Snapshot } from '../Models/SnapshotModel'
import { validateToken } from '../Utilities/JWT/LoginTokenPayload'
import { log } from '../Utilities/Logger'
import { AuthorityService } from './AuthorityService'
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
  constructor(
    private readonly socketsService: SocketsService,
    private readonly authorityService: AuthorityService
  ) {}

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
    const manuscript: Manuscript | null =
      await DIContainer.sharedContainer.projectClient.getProject(manuscriptID)

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

    const authToken = request.headers['sec-websocket-protocol']
    const { manuscriptID, projectID } = validateListenUrl(url)

    if (!manuscriptID || !projectID || !authToken) {
      this.destroyStream(socket)
      return
    }
    try {
      this.validateTokenAccess(authToken, projectID, DocumentPermission.READ)
    } catch (error) {
      this.destroyStream(socket)
      return
    }

    wss.handleUpgrade(request, socket, head, async (ws) =>
      this.setupConnection(wss, socket, ws, request, manuscriptID)
    )
  }
  private async setupConnection(
    wss: WebSocketServer,
    stream: Duplex,
    ws: WebSocket,
    request: IncomingMessage,
    manuscriptID: string
  ) {
    wss.emit('connection', ws, request)
    this.socketsService.setClient(manuscriptID, ws)
    this.attachListeners(stream, ws, manuscriptID)
    this.socketsService.send(JSON.stringify({ 'Transformer-Version': getVersion() }), ws)
    log.info(`connection established for ${manuscriptID}`)
  }

  private attachListeners(stream: Duplex, ws: WebSocket, manuscriptID: string) {
    ws.onerror = (error) => this.onError(ws, error)
    ws.onclose = () => this.onClose(ws, manuscriptID)
    ws.onmessage = (message) => this.onMessage(stream, ws, message)
  }

  private onError(ws: WebSocket, error: ErrorEvent) {
    log.error(`webSocket error: ${error}`)
    this.closeSocket(ws)
  }
  private onClose = (ws: WebSocket, manuscriptID: string) => {
    log.info(`connection closed for ${manuscriptID}`)
    this.closeSocket(ws, manuscriptID)
  }

  private async receiveSteps(
    projectID: string,
    manuscriptID: string,
    payload: ReceiveSteps,
    token: string
  ) {
    await this.validateTokenAccess(token, projectID, DocumentPermission.WRITE)
    const history = await this.authorityService.receiveSteps(manuscriptID, payload)
    this.socketsService.broadcast(manuscriptID, JSON.stringify(history))
  }

  private async onMessage(stream: Duplex, ws: WebSocket, message: MessageEvent) {
    const { manuscriptID, projectID, authToken, payload } = this.parseMessage(message)
    if (
      !manuscriptID ||
      !projectID ||
      !authToken ||
      !payload ||
      (payload && !this.isReceiveStepsPayload(payload))
    ) {
      return this.handleInvalidData(stream, ws, manuscriptID)
    }
    try {
      await this.receiveSteps(projectID, manuscriptID, payload, authToken)
    } catch (error) {
      if (error instanceof VersionMismatchError) {
        this.socketsService.send(
          JSON.stringify({ code: error.statusCode, error: error.message }),
          ws
        )
      } else {
        this.handleInvalidData(stream, ws, manuscriptID)
        log.error(`error handling message: ${error}`)
      }
    }
  }

  private isReceiveStepsPayload(payload: any): payload is ReceiveSteps {
    return (
      Array.isArray(payload.steps) &&
      payload.steps.every((step: object) => typeof step === 'object' && step !== null) &&
      typeof payload.clientID === 'number' &&
      typeof payload.version === 'number'
    )
  }

  private parseMessage(message: MessageEvent) {
    let parsedMessage
    if (typeof message.data === 'string') {
      parsedMessage = JSON.parse(message.data)
    } else {
      parsedMessage = message.data
    }
    return parsedMessage
  }

  private handleInvalidData(stream: Duplex, ws: WebSocket, manuscriptID?: string) {
    this.destroyStream(stream)
    this.closeSocket(ws, manuscriptID)
  }

  public closeSocket(ws: WebSocket, manuscriptID?: string) {
    try {
      ws.removeAllListeners()
      ws.close()
    } catch (error) {
      log.error(`error closing socket: ${error}`)
    }
    if (manuscriptID) {
      this.socketsService.removeClient(manuscriptID)
      log.info(`removed client for manuscript ${manuscriptID}`)
    }
  }

  public destroyStream(stream: Duplex) {
    try {
      stream.destroy()
    } catch (error) {
      log.error(`error destroying duplex: ${error}`)
    }
  }
}
