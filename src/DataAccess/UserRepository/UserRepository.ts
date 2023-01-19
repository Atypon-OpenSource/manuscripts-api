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

import { Prisma } from '@prisma/client'

import { DatabaseError } from '../../Errors'
import { INewUser, IUpdateUser, User, userForRow, UserRow } from '../../Models/UserModels'
import { IUserRepository } from '../Interfaces/IUserRepository'
import { UserQueryCriteria } from '../Interfaces/QueryCriteria'
import { SQLRepository } from '../SQLRepository'
import { maxLength, required, validEmail } from '../validators'

/**
 * Manages user persistent storage operations.
 */
export class UserRepository
  extends SQLRepository<User, INewUser, Partial<IUpdateUser>, UserQueryCriteria>
  implements IUserRepository
{
  /**
   * Returns document type
   */
  public get documentType(): string {
    return 'User'
  }

  public buildSchemaDefinition(): any {
    return {
      _id: {
        type: 'string',
        auto: 'uuid',
        readonly: true,
      },
      name: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'name')
          maxLength(val, 100, 'name')
        },
      },
      email: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'email')
          validEmail(val, 'email')
          maxLength(val, 100, 'email')
        },
      },
      connectUserID: {
        type: 'string',
      },
      deleteAt: {
        type: 'number',
      },
    }
  }

  /**
   * Builds a user model from a user row object.
   */
  public buildModel(user: UserRow): User {
    return userForRow(user)
  }

  /**
   * Returns users based on the value of property `deleteAt`.
   */
  public getUsersToDelete(): Promise<User[] | null> {
    const Q = {
      data: {
        path: ['deleteAt'],
        lte: new Date(),
      },
    }
    return new Promise((resolve, reject) => {
      return this.database.bucket
        .query(Q)
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error getting users to delete ${this.documentType}`,
              JSON.stringify(Q)
            )
          )
        )
        .then((docs: any) => {
          if (docs && docs.length) {
            const users = docs.map((user: any) => {
              return this.buildModel(user)
            })
            return resolve(users)
          } else {
            return resolve(null)
          }
        })
    })
  }
}
