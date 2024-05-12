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

import { Prisma, PrismaClient } from '@prisma/client'
import { v4 as uuid_v4 } from 'uuid'

import { Events } from '../Models/EventModels'

export class EventExtender {
  static readonly EVENT_MODEL = 'event'
  private static prisma: PrismaClient
  private static extensions: ReturnType<typeof this.buildExtensions>

  static getExtension(prisma: PrismaClient) {
    this.prisma = prisma
    this.extensions = this.buildExtensions()
    return this.extend()
  }
  private static buildExtensions() {
    return {
      createUserEvent: this.createUserEvent(),
      createProjectEvent: this.createProjectEvent(),
    }
  }

  private static extend() {
    return Prisma.defineExtension({
      name: this.EVENT_MODEL,
      model: {
        [this.EVENT_MODEL]: this.extensions,
      },
    })
  }

  private static createUserEvent() {
    return async (userID: string, type: Events) => {
      await this.prisma.event.create({
        data: {
          type,
          userID,
          id: this.EventID(),
        },
      })
    }
  }
  private static createProjectEvent() {
    return async (projectID: string, type: Events) => {
      await this.prisma.event.create({
        data: {
          type,
          projectID,
          id: this.EventID(),
        },
      })
    }
  }

  private static EventID() {
    return `Event_${uuid_v4()}`
  }
}
