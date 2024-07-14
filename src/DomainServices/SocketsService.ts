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

import { WebSocket } from 'ws'

import { log } from '../Utilities/Logger'
export class SocketsService {
  private clients: Map<string, WebSocket> = new Map()

  public getClient(manuscriptID: string): WebSocket | undefined {
    return this.clients.get(manuscriptID)
  }

  public setClient(manuscriptID: string, client: WebSocket): void {
    this.clients.set(manuscriptID, client)
  }

  public removeClient(manuscriptID: string): boolean {
    return this.clients.delete(manuscriptID)
  }

  public broadcast(manuscriptID: string, message: string) {
    const socket = this.clients.get(manuscriptID) as WebSocket
    if (socket) {
      this.send(message, socket)
    } else {
      log.error(`no client found for ${manuscriptID}`)
    }
  }

  public send(message: string, ws: WebSocket) {
    try {
      ws.send(message)
    } catch (error) {
      this.closeOrErrorHandler(ws)
    }
  }

  private closeOrErrorHandler(webSocket: WebSocket) {
    try {
      webSocket.close()
    } catch (error) {
      log.error(`error closing socket: ${error}`)
    }
  }
}
