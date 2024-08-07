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
  private clientsMap: Map<string, Set<WebSocket>> = new Map()

  public addClient(manuscriptID: string, client: WebSocket) {
    const clients = this.clientsMap.get(manuscriptID)
    if (clients) {
      clients.add(client)
    } else {
      this.clientsMap.set(manuscriptID, new Set([client]))
    }
  }

  public removeClient(manuscriptID: string, webSocket: WebSocket): void {
    const clients = this.clientsMap.get(manuscriptID)
    if (clients) {
      clients.delete(webSocket)
      if (clients.size === 0) {
        this.clientsMap.delete(manuscriptID)
      }
    }
  }

  public broadcast(manuscriptID: string, message: string) {
    const clients = this.clientsMap.get(manuscriptID)
    if (clients) {
      clients.forEach((client) => {
        this.send(message, client)
      })
    }
  }

  private send(message: string, ws: WebSocket) {
    try {
      ws.send(message)
    } catch (error) {
      this.close(ws)
    }
  }

  private close(webSocket: WebSocket) {
    try {
      webSocket.close()
    } catch (error) {
      log.error(`error closing socket: ${error}`)
    }
  }
}
