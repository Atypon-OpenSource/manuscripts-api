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

import {
  SchemaDefinition as OttomanSchemaDefinition,
  ModelOptions as OttomanModelOptions,
} from 'ottoman'

import { SQLRepository } from '../SQLRepository'
import { IUserStatusRepository } from '../Interfaces/IUserStatusRepository'
import { QueryCriteria } from '../Interfaces/QueryCriteria'
import { UserStatus, UpdateUserStatus } from '../../Models/UserModels'
import { date, objectValuedObject } from '../validators'
import { PatchOptions } from '../Interfaces/IndexedRepository'

import { Chance } from 'chance'

const chance = new Chance()
const fakeStatus: UserStatus = {
  _id: chance.string(),
  password: chance.string(),
  isVerified: chance.bool(),
  blockUntil: chance.date(),
  createdAt: chance.date(),
  deviceSessions: {},
}

/**
 * Manages user status persistent storage operations.
 */
export class UserStatusRepository
  extends SQLRepository<UserStatus, UserStatus, UpdateUserStatus, QueryCriteria>
  implements IUserStatusRepository
{
  /**
   * Returns document type
   */
  public get documentType(): string {
    return 'UserStatus'
  }

  public buildModelOptions(): OttomanModelOptions {
    return {
      index: {
        findByUserId: {
          type: 'n1ql',
          by: 'userId',
        },
      },
    }
  }

  public buildSchemaDefinition(): OttomanSchemaDefinition {
    return {
      _id: {
        type: 'string',
        auto: 'uuid',
        readonly: true,
      },
      password: {
        type: 'string',
      },
      isVerified: {
        type: 'boolean',
        default: false,
      },
      blockUntil: {
        type: 'Date',
        default: null,
        validator: (val?: Date) => {
          if (val) {
            date(val, 'blockUntil')
          }
        },
      },
      createdAt: {
        type: 'Date',
        validator: (val: Date) => {
          date(val, 'createdAt')
        },
      },
      deviceSessions: {
        type: 'Mixed',
        validator: (val: object) => {
          objectValuedObject(val, 'deviceSessions')
        },
      },
      // This is needed because old user records may still have this preceding removal of wayf-cloud support,
      // and without it would fail validation.
      allowsTracking: {
        type: 'boolean',
      },
    }
  }

  public buildSemiFake(data: any): UserStatus {
    return Object.assign(fakeStatus, data)
  }

  /**
   * Returns the user status for a specific user id.
   */
  public async statusForUserId(userId: string): Promise<UserStatus | null> {
    return this.getById(this.userStatusId(userId))
  }

  /**
   * Patches existing user status by a specific user id.
   */
  public async patchStatusWithUserId(
    userId: string,
    dataToPatch: Partial<UpdateUserStatus>,
    options: PatchOptions
  ): Promise<UserStatus> {
    return this.patch(this.userStatusId(userId), dataToPatch, options)
  }

  /**
   * Builds a user status model from a user row object.
   */
  public buildModel(userStatus: UserStatus): UserStatus {
    return userStatus
  }

  /**
   * Returns user status id based on user id
   */
  public userStatusId(userId: string): string {
    return this.fullyQualifiedId(userId)
  }
}
