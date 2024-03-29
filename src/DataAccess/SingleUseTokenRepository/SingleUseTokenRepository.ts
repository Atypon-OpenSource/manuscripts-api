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

import { v4 as uuid_v4 } from 'uuid'

import {
  NewSingleUseToken,
  SingleUseToken,
  SingleUseTokenType,
  UpdateSingleUseToken,
} from '../../Models/SingleUseTokenModels'
import { User } from '../../Models/UserModels'
import { ISingleUseTokenRepository } from '../Interfaces/ISingleUseTokenRepository'
import { SingleUseTokenQueryCriteria } from '../Interfaces/QueryCriteria'
import { SQLRepository } from '../SQLRepository'
import { date, required } from '../validators'

/**
 * Manages tokens persistent storage operations.
 */
export class SingleUseTokenRepository
  extends SQLRepository<
    SingleUseToken,
    NewSingleUseToken,
    UpdateSingleUseToken,
    SingleUseTokenQueryCriteria
  >
  implements ISingleUseTokenRepository
{
  public get documentType(): string {
    return 'SingleUseToken'
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
      tokenType: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'tokenType')
        },
      },
      createdAt: {
        type: 'number',
        validator: (val: Date) => {
          date(val, 'createdAt')
        },
      },
      updatedAt: {
        type: 'number',
        validator: (val: Date) => {
          if (val) {
            date(val, 'updatedAt')
          }
        },
      },
    }
  }

  // The number | undefined is intentional: expiry value accepted by patch options is `number | undefined`.
  public async ensureTokenExists(
    user: User,
    tokenType: SingleUseTokenType,
    _expiry: number | undefined
  ): Promise<string> {
    let tokenId
    const token = await this.getOne({ userId: user._id, tokenType: tokenType })

    if (token !== null) {
      tokenId = token._id
      await this.patch(token._id, { updatedAt: new Date().getTime() })
    } else {
      tokenId = uuid_v4()
      const token = {
        _id: tokenId,
        userId: user._id,
        tokenType: tokenType,
        createdAt: new Date().getTime(),
      }

      const newToken = await this.create(token)
      tokenId = newToken._id
    }
    return tokenId
  }
}
