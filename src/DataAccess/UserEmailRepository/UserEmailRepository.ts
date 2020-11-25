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

import { SchemaDefinition as OttomanSchemaDefinition } from 'ottoman'

import { CBRepository } from '../CBRepository'
import { IUserEmailRepository } from '../Interfaces/IUserEmailRepository'
import { UserEmail } from '../../Models/UserModels'

/**
 * Manages user email persistent storage operations.
 */
class UserEmailRepository extends CBRepository<UserEmail, UserEmail, {}, {}>
  implements IUserEmailRepository {
  public get documentType (): string {
    return 'UserEmail'
  }

  public buildSchemaDefinition (): OttomanSchemaDefinition {
    return {
      _id: {
        type: 'string',
        readonly: true
      }
    }
  }

  /**
   * Builds a user email model from a user email object.
   */
  public buildModel (userEmail: UserEmail): UserEmail {
    return { ...userEmail }
  }
}

export { UserEmailRepository }
