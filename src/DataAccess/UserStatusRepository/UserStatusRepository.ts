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

import { UpdateUserStatus, UserStatus } from '../../Models/UserModels'
import { IUserStatusRepository } from '../Interfaces/IUserStatusRepository'
import { QueryCriteria } from '../Interfaces/QueryCriteria'
import { SQLRepository } from '../SQLRepository'
import { date, objectValuedObject } from '../validators'

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

  public buildSchemaDefinition(): any {
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
    dataToPatch: Partial<UpdateUserStatus>
  ): Promise<UserStatus> {
    return this.patch(this.userStatusId(userId), dataToPatch)
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
