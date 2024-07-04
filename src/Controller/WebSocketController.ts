/*!
 * © 2024 Atypon Systems LLC
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
import { IncomingMessage } from 'http'
import { Duplex } from 'stream'
import { ErrorEvent, MessageEvent, WebSocket, WebSocketServer } from 'ws'

import { DIContainer } from '../DIContainer/DIContainer'
import { AuthorityService } from '../DomainServices/AuthorityService'
import { DocumentPermission, DocumentService } from '../DomainServices/DocumentService'
import { SocketsService } from '../DomainServices/SocketsService'
import { getManuscriptIDFromRequest } from '../util'
import { log } from '../Utilities/Logger'

export class WebSocketController {
  private socketsService: SocketsService
  private authorityService: AuthorityService
  private documentService: DocumentService
  constructor(private readonly wss: WebSocketServer) {
    this.socketsService = DIContainer.sharedContainer.socketsService
    this.authorityService = DIContainer.sharedContainer.authorityService
    this.documentService = DIContainer.sharedContainer.documentService
  }

  public handleUpgrade = async (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    this.wss.handleUpgrade(request, socket, head, async (ws) =>
      this.setupConnection(socket, ws, request)
    )
  }

  private setupConnection = async (stream: Duplex, ws: WebSocket, request: IncomingMessage) => {
    const manuscriptID = getManuscriptIDFromRequest(request)
    this.wss.emit('connection', ws, request)
    this.attachListeners(stream, ws, manuscriptID)
    log.info(`Connection established for ${manuscriptID}`)
  }

  private attachListeners = (stream: Duplex, ws: WebSocket, manuscriptID: string) => {
    ws.onerror = (error) => this.onError(ws, error)
    ws.onclose = () => this.onClose(ws, manuscriptID)
    ws.onmessage = (message) => this.onMessage(stream, ws, message)
  }

  private onError = (ws: WebSocket, error: ErrorEvent) => {
    log.error(`WebSocket error: ${error}`)
    this.socketsService.closeSocket(ws)
  }
  private onClose = (ws: WebSocket, manuscriptID: string) => {
    log.info(`Connection closed for ${manuscriptID}`)
    this.socketsService.closeSocket(ws, manuscriptID)
  }

  private onMessage = async (stream: Duplex, ws: WebSocket, message: MessageEvent) => {
    const { manuscriptID, projectID, authToken } = this.parseMessage(message)
    if (!manuscriptID || !projectID || !authToken) {
      return this.handleInvalidData(stream, ws, manuscriptID)
    }
    try {
      await this.documentService.validateTokenAccess(authToken, projectID, DocumentPermission.READ)
      this.socketsService.setClient(manuscriptID, ws)
      await this.sendHistoryToSocket(manuscriptID, ws)
    } catch (error) {
      log.error(`Error handling message: ${error}`)
      this.handleInvalidData(stream, ws, manuscriptID)
    }
  }

  private parseMessage = (message: MessageEvent) => {
    let parsedMessage
    if (typeof message.data === 'string') {
      parsedMessage = JSON.parse(message.data)
    } else {
      parsedMessage = message.data
    }
    return parsedMessage
  }

  private sendHistoryToSocket = async (manuscriptID: string, ws: WebSocket) => {
    const history = await this.authorityService.getEvents(manuscriptID, 0, true)
    this.socketsService.send(
      JSON.stringify({ ...history, 'Transformer-Version': getVersion() }),
      ws
    )
  }
  private handleInvalidData = (stream: Duplex, ws: WebSocket, manuscriptID?: string) => {
    log.error('Invalid data received')
    this.socketsService.destroyStream(stream)
    this.socketsService.closeSocket(ws, manuscriptID)
  }
}
