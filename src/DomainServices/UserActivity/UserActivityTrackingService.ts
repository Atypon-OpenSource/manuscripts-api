/*!
 * © 2020 Atypon Systems LLC
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

import { log } from '../../Utilities/Logger'
import { UserActivityEvent, UserActivityEventType } from '../../Models/UserEventModels'
import { IUserEventRepository } from '../../DataAccess/Interfaces/IUserEventRepository'
import { Environment } from '../../Config/ConfigurationTypes'
import { timestamp } from '../../Utilities/JWT/LoginTokenPayload'

export class UserActivityTrackingService {
  readonly eventLifetime: number
  userEventRepository: IUserEventRepository
  private awaitCreateResolvers: Array<() => void>
  private creationCount: number
  private enabled: boolean

  constructor (userEventRepository: IUserEventRepository, enabled: boolean) {
    this.userEventRepository = userEventRepository
    this.eventLifetime = (timestamp()) + (30 * 24 * 60 * 60) // add 30 days in seconds to current time.
    this.awaitCreateResolvers = []
    this.creationCount = 0
    this.enabled = enabled
  }

  awaitCreation (): Promise<void> {
    if (this.creationCount === 0) {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      // the 'resolve' functions in this array will all be called by createEvent
      //  callback the next time creationCount === 0
      this.awaitCreateResolvers.push(resolve)
    })
  }

  createEvent (userId: string, eventType: UserActivityEventType, appId: string | null, deviceId: string | null): Promise <UserActivityEvent> | null {
    if (this.enabled) {
      const event = {
        userId,
        createdAt: new Date(),
        eventType,
        appId,
        deviceId
      }

      this.creationCount++

      const eventCreationPromise = this.userEventRepository.create(event, { expiry: this.eventLifetime })
      eventCreationPromise
      .then((event: UserActivityEvent) => {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== Environment.Test) {
          log.debug(`Logged user activity event: ${event.userId} - ${event.eventType}`)
        }
        this.creationCount--
        if (this.creationCount === 0 && this.awaitCreateResolvers.length > 0) {
          this.awaitCreateResolvers.forEach((r) => r())
          this.awaitCreateResolvers = []
        }
      })
      .catch((error: Error) => {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== Environment.Test) {
          log.error('An error occurred while creating login event', { event, error })
        }
        this.creationCount--
        if (this.creationCount === 0 && this.awaitCreateResolvers.length > 0) {
          this.awaitCreateResolvers.forEach((r) => r())
          this.awaitCreateResolvers = []
        }
      })
      return eventCreationPromise
    }
    return null
  }
}
