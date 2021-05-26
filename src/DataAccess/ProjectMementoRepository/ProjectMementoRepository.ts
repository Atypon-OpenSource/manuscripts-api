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

import { N1qlQuery, CouchbaseError } from 'couchbase'
import { ProjectMemento } from '@manuscripts/manuscripts-json-schema'

import { SGRepository } from '../SGRepository'
import { GatewayOptions } from '../Interfaces/KeyValueRepository'
import {
  MethodNotAllowedError,
  NoBucketError,
  DatabaseError
} from '../../Errors'
import { databaseErrorMessage } from '../DatabaseResponseFunctions'
import { username as sgUsername } from '../../DomainServices/Sync/SyncService'

export class ProjectMementoRepository extends SGRepository<any, any, any, any> {
  public get objectType (): string {
    return 'MPProjectMemento'
  }

  public get bucketName (): string {
    if (!this.database.bucket) {
      throw new NoBucketError()
    }

    return (this.database.bucket as any)._name
  }

  public async update (
    _id: string,
    _updatedDocument: any,
    _updateOptions: GatewayOptions
  ): Promise<any> {
    throw new MethodNotAllowedError('ProjectMementoRepository', 'update')
  }

  public async clearMementos (userId: string): Promise<void> {
    const projectMementos = await this.getByUserId(userId)

    for (const projectMemento of projectMementos) {
      await this.purge(projectMemento._id)
    }
  }

  /**
   * Get user collaborator by user id.
   * @param userId user id.
   */
  public async getByUserId (userId: string) {
    const syncUserId = sgUsername(userId)

    const n1ql = `SELECT *, META().id FROM ${this.bucketName}
                  WHERE objectType = \'${this.objectType}\'
                  AND userID = $1`

    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(this.n1qlConsistency)

    return new Promise<ProjectMemento []>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [syncUserId],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )

            return reject(
              new DatabaseError(error.code, errorMsg, userId, error)
            )
          }

          if (results.length) {
            let projectMementos: ProjectMemento[] = []

            for (const memento of results) {
              const projectMemento: ProjectMemento = {
                ...memento[this.bucketName],
                _id: memento.id
              }
              projectMementos.push(projectMemento)
            }

            return resolve(projectMementos)
          }

          return resolve([])
        }
      )
    })
  }
}
