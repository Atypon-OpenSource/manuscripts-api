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

import { SchemaDefinition as OttomanSchemaDefinition, ModelOptions as OttomanModelOptions } from 'ottoman'

import { CBRepository } from '../CBRepository'
import { IUserEventRepository } from '../Interfaces/IUserEventRepository'
import { QueryCriteria } from '../Interfaces/QueryCriteria'
import { UserActivityEvent } from '../../Models/UserEventModels'
import { required, maxLength, date } from '../validators'

/**
 * Manages user event persistent storage operations.
 */
export class UserEventRepository extends CBRepository<UserActivityEvent, UserActivityEvent, UserActivityEvent, QueryCriteria> implements IUserEventRepository {
  /**
   * Returns document type
   */
  public get documentType (): string {
    return 'UserEvent'
  }

  public buildModelOptions (): OttomanModelOptions {
    return {
      index: {
        findByUserId: {
          type: 'n1ql',
          by: 'userId'
        }
      }
    }
  }

  public buildSchemaDefinition (): OttomanSchemaDefinition {
    return {
      _id: {
        type: 'string',
        auto: 'uuid',
        readonly: true
      },
      userId: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'userId')
        }
      },
      createdAt: {
        type: 'Date',
        validator: (val: Date) => {
          date(val, 'timestamp')
        }
      },
      deviceId: {
        type: 'string',
        validator: (val: string) => {
          if (val) {
            maxLength(val, 100, 'deviceId')
          }
        }
      },
      appId: {
        type: 'string',
        validator: (val: string) => {
          if (val) {
            maxLength(val, 100, 'appId')
          }
        }
      },
      eventType: {
        type: 'number'
      }
    }
  }

  /**
   * Builds a user model from a user row object.
   */
  public buildModel (user: UserActivityEvent): UserActivityEvent {
    return user
  }
}
