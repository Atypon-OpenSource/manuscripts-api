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

import { Invitation } from '@manuscripts/manuscripts-json-schema/dist/types'
import { CouchbaseError, N1qlQuery } from 'couchbase'
import { PatchInvitation } from 'src/Models/InvitationModels'

import { DatabaseError } from '../../Errors'
import { databaseErrorMessage } from '../DatabaseErrorMessage'
import { InvitationLike } from '../Interfaces/Models'
import { SGRepository } from '../SGRepository'

/**
 * Manages invitation persistent storage operations.
 */
export class InvitationRepository extends SGRepository<
  InvitationLike,
  InvitationLike,
  InvitationLike,
  PatchInvitation
> {
  public get objectType (): string {
    return 'MPInvitation'
  }

  public async getAllByEmail (email: string) {
    const n1ql = `SELECT META().id, * FROM ${this.bucketName}
                  WHERE objectType = \'${this.objectType}\'
                  AND invitedUserEmail = $1
                  AND _deleted IS MISSING`

    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(this.n1qlConsistency)

    return new Promise<Invitation[]>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [email],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )

            return reject(new DatabaseError(error.code, errorMsg, null, error))
          }

          const objects = results.map((result: any) => {
            const obj = {
              ...result[this.bucketName],
              _id: result.id
            }
            return obj
          })

          return resolve(objects)
        }
      )
    })
  }
}
