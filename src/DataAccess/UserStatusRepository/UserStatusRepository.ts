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
import { CouchbaseError, ViewQuery } from 'couchbase'
import { isNumber } from '../../util'

import { CBRepository } from '../CBRepository'
import { IUserStatusRepository } from '../Interfaces/IUserStatusRepository'
import { QueryCriteria } from '../Interfaces/QueryCriteria'
import { UserStatus, UpdateUserStatus, UserStatusViewFunctionDocument } from '../../Models/UserModels'
import { DatabaseError, UnexpectedViewStateError } from '../../Errors'
import { date, objectValuedObject } from '../validators'
import { DatabaseView } from '../DatabaseView'
import { ViewMapFunctionMeta, ViewReducer } from '../../Models/DatabaseViewModels'
import { databaseErrorMessage } from '../DatabaseResponseFunctions'
import { PatchOptions } from '../Interfaces/IndexedRepository'

/**
 * Manages user status persistent storage operations.
 */
export class UserStatusRepository extends CBRepository<UserStatus, UserStatus, UpdateUserStatus, QueryCriteria> implements IUserStatusRepository {
  /* istanbul ignore next */
  private failedLoginCountView: DatabaseView = {
    name: 'failedLoginCount',
    map: function (doc: UserStatusViewFunctionDocument, _meta: ViewMapFunctionMeta) {
      if (doc._type === 'UserEvent' && ['SuccessfulLogin', 'FailedLogin'].indexOf(doc.eventType) >= 0) {
        emit(doc.userId, doc)
      }
    },
    reduce: function (_key: string, values: UserStatusViewFunctionDocument[], _rereduce: ViewReducer) {
      values.sort(function (a: UserStatusViewFunctionDocument, b: UserStatusViewFunctionDocument) {
        return b.timestamp - a.timestamp
      })

      let failedCount = 0
      values.forEach(function (doc: any) {
        if (doc.eventType === 'SuccessfulLogin') {
          return false
        }
        failedCount++
      })

      return failedCount
    }
  }

  /**
   * Returns document type
   */
  public get documentType (): string {
    return 'UserStatus'
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
      password: {
        type: 'string'
      },
      isVerified: {
        type: 'boolean',
        default: false
      },
      blockUntil: {
        type: 'Date',
        default: null,
        validator: (val?: Date) => {
          if (val) {
            date(val, 'blockUntil')
          }
        }
      },
      createdAt: {
        type: 'Date',
        validator: (val: Date) => {
          date(val, 'createdAt')
        }
      },
      deviceSessions: {
        type: 'Mixed',
        validator: (val: object) => {
          objectValuedObject(val, 'deviceSessions')
        }
      },
      // This is needed because old user records may still have this preceding removal of wayf-cloud support,
      // and without it would fail validation.
      allowsTracking: {
        type: 'boolean'
      }
    }
  }

  public buildViews (): ReadonlyArray<DatabaseView> {
    return [this.failedLoginCountView]
  }

  /**
   * Returns an approximate number of failed login attempts since last success login.
   * The value returned is only approximately correct because it is queried with the ViewQuery.Update.AFTER consistency setting.
   */
  public failedLoginCount (key: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // we're happy with an eventually consistent view of failed login counts.
      const view = ViewQuery.from(this.designDocumentName, this.failedLoginCountView.name)
                            .key(key)
                            .reduce(true)
                            .stale(ViewQuery.Update.AFTER)

      this.database.bucket.query(view as any, (error: CouchbaseError, rows: any[]) => {
        if (error) {
          const errorMsg = databaseErrorMessage(error.code, error.message)
          return reject(new DatabaseError(error.code, errorMsg, key, error))
        }
        if (rows.length) {
          const value = rows[0].value
          if (!isNumber(value)) {
            return reject(new UnexpectedViewStateError(`The returned result of view :${this.failedLoginCountView.name} should be numeric value`, key, value))
          } else {
            return resolve(value)
          }
        } else {
          return resolve(0)
        }
      })
    })
  }

  /**
   * Returns the user status for a specific user id.
   */
  public async statusForUserId (userId: string): Promise<UserStatus | null> {
    return this.getById(this.userStatusId(userId))
  }

  /**
   * Patches existing user status by a specific user id.
   */
  public async patchStatusWithUserId (userId: string, dataToPatch: Partial<UpdateUserStatus>, options: PatchOptions): Promise<UserStatus> {
    return this.patch(this.userStatusId(userId), dataToPatch, options)
  }

  /**
   * Builds a user status model from a user row object.
   */
  public buildModel (userStatus: UserStatus): UserStatus {
    return userStatus
  }

  /**
   * Returns user status id based on user id
   */
  public userStatusId (userId: string): string {
    return this.fullyQualifiedId(userId)
  }
}
