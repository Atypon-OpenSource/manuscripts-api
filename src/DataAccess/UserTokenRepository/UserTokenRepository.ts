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

import { SQLRepository } from '../SQLRepository'
import { IUserTokenRepository } from '../Interfaces/IUserTokenRepository'
import { UserToken } from '../../Models/UserModels'
import { UserTokenQueryCriteria } from '../Interfaces/QueryCriteria'
import { required, maxLength, stringValuedNestedObject } from '../validators'

/**
 * Manages user token persistent storage operations.
 */
export class UserTokenRepository
  extends SQLRepository<UserToken, UserToken, UserToken, UserTokenQueryCriteria>
  implements IUserTokenRepository
{
  public get documentType(): string {
    return 'UserToken'
  }

  public buildSchemaDefinition(): any {
    return {
      _id: {
        type: 'string',
        auto: 'uuid',
        readonly: true,
      },
      userId: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'userId')
        },
      },
      deviceId: {
        type: 'string',
        validator: (val: string) => {
          maxLength(val, 100, 'deviceId')
          required(val, 'deviceId')
        },
      },
      hasExpiry: {
        type: 'boolean',
      },
      appId: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'appId')
        },
      },
      token: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'token')
        },
      },
      iamSessionID: {
        type: 'string',
      },
      credentials: {
        type: 'Mixed',
        validator: (val: object) => {
          stringValuedNestedObject(val, 'credentials')
        },
      },
    }
  }

  /**
   * Builds a user token model from a user token object.
   */
  public buildModel(userToken: UserToken): UserToken {
    return { ...userToken }
  }
}
