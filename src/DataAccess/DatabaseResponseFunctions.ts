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

import { Bucket, CouchbaseError, errors, N1qlQuery } from 'couchbase'
import { DatabaseError } from '../Errors'

export function databaseErrorMessage (errorCode: errors | undefined, message: string | null): string {
  switch (errorCode) {
    case errors.keyAlreadyExists:
      return 'Document id already exists.'
    case errors.keyNotFound:
      return "Document doesn't exist in db."
    default:
      return message || `General Couchbase error (code ${errorCode}).`
  }
}

export async function selectN1QLQuery<Entity> (
  bucket: Bucket,
  n1ql: string,
  queryParams: Array<string | null>,
  callback: Function
) {
  const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(N1qlQuery.Consistency.REQUEST_PLUS)

  return new Promise<Entity>((resolve, reject) => {
    bucket.query(
    statement,
    queryParams,
    (error: CouchbaseError | null, results: any) => {
      if (error) {
        const errorMsg: string = databaseErrorMessage(
          error.code,
          error.message
        )
        return reject(
          new DatabaseError(error.code, errorMsg, queryParams, error)
        )
      }
      return resolve(callback(results))
    })
  })
}
