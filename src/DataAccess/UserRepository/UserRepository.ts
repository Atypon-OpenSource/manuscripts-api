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
import { IUserRepository } from '../Interfaces/IUserRepository'
import { UserQueryCriteria } from '../Interfaces/QueryCriteria'
import { User, INewUser, IUpdateUser, UserRow, userForRow } from '../../Models/UserModels'
import { required, maxLength, validEmail } from '../validators'
// import { N1qlQuery } from 'couchbase'
// import { databaseErrorMessage } from '../DatabaseResponseFunctions'
import { DatabaseError } from '../../Errors'
// import { timestamp } from '../../Utilities/JWT/LoginTokenPayload'
import { Prisma } from '@prisma/client'
import { Chance } from 'chance'

const chance = new Chance()
const fakeUser: User = {
  _id: chance.string(),
  name: chance.string(),
  email: chance.email(),
}

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

  public buildModelOptions(): OttomanModelOptions {
    return {
      index: {
        findByEmail: {
          type: 'n1ql',
          by: 'email',
        },
        findByName: {
          type: 'n1ql',
          by: 'name',
        },
        findByConnectUserID: {
          type: 'n1ql',
          by: 'connectUserID',
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

  public buildSemiFake(data: any): User {
    return Object.assign(fakeUser, data)
  }

  /**
   * Returns users based on the value of property `deleteAt`.
   */
  public getUsersToDelete(): Promise<User[] | null> {
    // const currentTime = Math.floor(timestamp())

    // const rawQ = `SELECT * FROM ${this.bucketName} WHERE _type = 'User' AND deleteAt IS VALUED AND deleteAt <= ${currentTime}`
    // const rawQ = Prisma.sql`SELECT * FROM "User" WHERE deleteAt <= ${currentTime}`

    const Q = {
      data: {
        path: ['deleteAt'],
        lte: new Date(),
      },
    }
    return new Promise((resolve, reject) => {
      this.database.bucket
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
            resolve(users)
          } else {
            resolve(null)
          }
        })
    })

    /*const n1ql = `SELECT * FROM ${this.bucketName} WHERE _type = 'User' AND deleteAt IS VALUED AND deleteAt <= ${currentTime}`

    return new Promise((resolve, reject) => {
      this.database.bucket.query(N1qlQuery.fromString(n1ql)
      , (error, results) => {
        if (error) {
          const errorMsg = databaseErrorMessage(error.code, error.message)
          return reject(new DatabaseError(error.code, errorMsg, '', error))
        }

        if (results && results.length) {
          const users = results.map((user) => {
            return this.buildModel(user[this.bucketName])
          })
          resolve(users)
        } else {
          resolve(null)
        }
      })
    })*/
  }
}
