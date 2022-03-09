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
import { IInvitationTokenRepository } from '../Interfaces/IInvitationTokenRepository'
import { InvitationToken, UpdateInvitationToken } from '../../Models/UserModels'
import { InvitationTokenQueryCriteria } from '../Interfaces/QueryCriteria'
import { required } from '../validators'

import { Chance } from 'chance'

const chance = new Chance()
const fakeToken: InvitationToken = {
  _id: chance.string(),
  containerID: chance.string(),
  permittedRole: 'viewer' as any,
  token: chance.string(),
}

/**
 * Manages invitation token persistent storage operations.
 */
export class InvitationTokenRepository
  extends SQLRepository<
    InvitationToken,
    InvitationToken,
    UpdateInvitationToken,
    InvitationTokenQueryCriteria
  >
  implements IInvitationTokenRepository
{
  public get documentType(): string {
    return 'InvitationToken'
  }

  public buildModelOptions(): OttomanModelOptions {
    return {
      index: {
        findByToken: {
          type: 'n1ql',
          by: 'token',
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
      containerID: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'containerID')
        },
      },
      permittedRole: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'permittedRole')
        },
      },
      token: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'token')
        },
      },
    }
  }

  /**
   * Builds an invitation token model from a invitation token object.
   */
  public buildModel(invitationToken: InvitationToken): InvitationToken {
    return { ...invitationToken }
  }

  public buildSemiFake(data: any): InvitationToken {
    return Object.assign(fakeToken, data)
  }
}
