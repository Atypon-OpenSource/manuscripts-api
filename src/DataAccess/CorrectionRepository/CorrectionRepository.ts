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
import { DatabaseError ,NoBucketError } from '../../Errors'
import { CouchbaseError ,N1qlQuery } from 'couchbase'
import { databaseErrorMessage } from '../DatabaseResponseFunctions'
import { CorrectionLike } from '../Interfaces/Models'
import { Correction } from '@manuscripts/manuscripts-json-schema/dist/types'

class CorrectionRepository
  extends SGRepository<
    Correction,
    CorrectionLike,
    CorrectionLike,
    Partial<Correction>
  > {
  public get objectType (): string {
    return 'MPCorrection'
  }

  public get bucketName (): string {
    if (!this.database.bucket) {
      throw new NoBucketError()
    }

    return (this.database.bucket as any)._name
  }

  public async getCorrectionStatus (containerID: string) {
    let n1ql = `SELECT projects.status.label, META().id FROM ${
      this.bucketName
    } WHERE containerID =$1 AND objectType = '${this.objectType}' AND _deleted IS MISSING`
    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(N1qlQuery.Consistency.REQUEST_PLUS)

    return new Promise((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [containerID],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )
            return reject(
              new DatabaseError(error.code, errorMsg, {},error)
            )
          }
          const groupByStatus = results.reduce((objectsByKeyValue: any, obj: any) => {
            const value = obj['label']
            objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj)
            return objectsByKeyValue
          }, {})
          let status: any = {}
          for (const [key, value] of Object.entries(groupByStatus)) {
            const items = value as []
            status[key] = items.length
          }
          return resolve(status)
        })
    })
  }

}

export { CorrectionRepository }
