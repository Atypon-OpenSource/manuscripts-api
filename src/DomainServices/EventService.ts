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

import { EventType } from '@prisma/client'
import EventEmitter from 'events'

import { EventClient } from '../DataAccess/Repository'
import { log } from '../Utilities/Logger'

export class EventManager extends EventEmitter {
  constructor(private readonly eventClient: EventClient) {
    super()
    this.registerListeners()
  }

  private registerListeners() {
    this.on(EventType.Registration, this.onUserEvent(EventType.Registration))
    this.on(EventType.Login, this.onUserEvent(EventType.Login))
    this.on(EventType.UpdateConnectID, this.onUserEvent(EventType.UpdateConnectID))
  }

  private onUserEvent(type: EventType) {
    return (userID: string) => {
      this.eventClient.createUserEvent(userID, type)
      log.debug(`Logged user activity event: ${userID} - ${type}`)
    }
  }
}
