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

import { SGRepository } from '../SGRepository'
import { DatabaseError, NoBucketError } from '../../Errors'
import { CouchbaseError, N1qlQuery } from 'couchbase'
import { ManuscriptNote } from '@manuscripts/manuscripts-json-schema'
import { databaseErrorMessage } from '../DatabaseErrorMessage'

class ManuscriptNoteRepository extends SGRepository<any, any, any, any> {
  public get objectType (): string {
    return 'MPManuscriptNote'
  }

  public get bucketName (): string {
    if (!this.database.bucket) {
      throw new NoBucketError()
    }

    return (this.database.bucket as any)._name
  }

  public async getProductionNotes (containerID: string, manuscriptID: string) {
    let n1ql = `SELECT *, META().id FROM ${
      this.bucketName
    } WHERE containerID = $1 and manuscriptID = $2 and objectType = 'MPManuscriptNote' AND _deleted IS MISSING`

    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(N1qlQuery.Consistency.STATEMENT_PLUS)
    return new Promise<ManuscriptNote[]>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [containerID, manuscriptID],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )
            return reject(
              new DatabaseError(error.code, errorMsg, [containerID, manuscriptID], error)
            )
          }

          return resolve(results)
        }

      )
    })
  }
}

export { ManuscriptNoteRepository }
