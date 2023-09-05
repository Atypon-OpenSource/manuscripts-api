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

import { InvitationToken, UpdateInvitationToken } from '../../Models/UserModels'
import { IInvitationTokenRepository } from '../Interfaces/IInvitationTokenRepository'
import { InvitationTokenQueryCriteria } from '../Interfaces/QueryCriteria'
import { SQLRepository } from '../SQLRepository'
import { required } from '../validators'

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

  public buildSchemaDefinition(): any {
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
}
