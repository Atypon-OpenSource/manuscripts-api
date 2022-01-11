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

import request from 'request-promise-native'
import * as HttpStatus from 'http-status-codes'
import * as _ from 'lodash'
import { N1qlQuery, CouchbaseError } from 'couchbase'
import { appDataAdminGatewayURI } from '../Config/ConfigAccessors'
import {
  ValidationError,
  SyncError,
  DatabaseError,
  NoBucketError, GatewayInaccessibleError
} from '../Errors'
import {
  KeyValueRepository,
  GatewayOptions
} from './Interfaces/KeyValueRepository'
import { username as sgUsername } from '../DomainServices/Sync/SyncService'
import { BucketKey } from '../Config/ConfigurationTypes'
import { Database } from './Database'
import { databaseErrorMessage } from './DatabaseResponseFunctions'
import { timestamp } from '../Utilities/JWT/LoginTokenPayload'

export abstract class SGRepository<
  TEntity,
  TNewEntity,
  TUpdateEntity,
  TPatchEntity
>
  implements
    KeyValueRepository<TEntity, TNewEntity, TUpdateEntity, TPatchEntity> {
  abstract get objectType (): string;

  readonly n1qlConsistency: N1qlQuery.Consistency

  constructor (
    readonly bucketKey: BucketKey,
    readonly database: Database,
    n1qlConsistency: N1qlQuery.Consistency = N1qlQuery.Consistency
      .REQUEST_PLUS
  ) {
    this.n1qlConsistency = n1qlConsistency
  }

  public get bucketName (): string {
    if (!this.database.bucket) {
      throw new NoBucketError()
    }

    return (this.database.bucket as any)._name
  }

  static async doRequest (options: any) {
    let response: any
    try {
      response = await request(options)
    } catch (error) {
      if (error.statusCode === HttpStatus.SERVICE_UNAVAILABLE) {
        throw new GatewayInaccessibleError(options.uri)
      }

      throw new SyncError(`Request to URL ${options.uri} failed`,response && response.body)
    }

    if (options.method === 'GET' && response.statusCode === HttpStatus.NOT_FOUND) return null

    if (response.statusCode === HttpStatus.CREATED || response.statusCode === HttpStatus.OK) return response.body

    throw new SyncError('SyncGateway object creation failed.', response.body)
  }

  /**
   * Creates new document.
   */
  public async create (
    newDocument: TNewEntity,
    createOptions: GatewayOptions
  ): Promise<TEntity> {
    const docId = this.documentId((newDocument as any)._id)
    const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${docId}`
    const expiry = createOptions.expiry
    const createdAt = timestamp()

    const preparedDocument = {
      ...(newDocument as any),
      _id: docId,
      objectType: this.objectType,
      updatedAt: createdAt,
      createdAt,
      _exp: expiry
    }

    return SGRepository.doRequest({
      method: 'PUT', // This way if the object exist in a _deleted form, it will upsert the object, creating a new one with the same _id.
      uri,
      body: preparedDocument,
      json: true,
      resolveWithFullResponse: true,
      simple: false
    })
  }

  /**
   * Returns single document based on unique id.
   */
  public async getById (id: string): Promise<TEntity | null> {
    const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${this.documentId(
      id
    )}`
    return SGRepository.doRequest({
      method: 'GET',
      uri: uri,
      json: true,
      resolveWithFullResponse: true,
      simple: false
    })
  }

  /**
   * Removes existing document.
   */
  public async remove (id: string | null): Promise<void> {
    if (id === null) {
      return this.removeAll()
    }

    const document = await this.getById(id)
    if (document) {
      const uri = `${appDataAdminGatewayURI(this.bucketKey)}/_bulk_docs`

      const body = {
        docs: [
          {
            ...document,
            _deleted: true
          }
        ]
      }

      return SGRepository.doRequest({
        method: 'POST',
        uri,
        body,
        json: true,
        resolveWithFullResponse: true,
        simple: false
      })
    }
  }

  /**
   * Replaces existing document.
   */
  public async update (
    id: string,
    updatedDocument: TUpdateEntity,
    updateOptions: GatewayOptions
  ): Promise<TEntity> {
    const document = await this.getById(id)

    if (!document) {
      throw new ValidationError(`Document with id ${id} does not exist`, id)
    }

    const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${this.documentId(
      id
    )}?rev=${(document as any)._rev}`

    if ((document as any).objectType !== this.objectType) {
      throw new ValidationError(
        `Object type mismatched`,
        (updatedDocument as any).objectType
      )
    }
    const expiry = updateOptions.expiry
    const preparedDocument = {
      ...(updatedDocument as any),
      objectType: this.objectType,
      _exp: expiry,
      createdAt: (document as any).createdAt,
      updatedAt: timestamp()
    }

    return SGRepository.doRequest({
      method: 'PUT',
      uri: uri,
      body: preparedDocument,
      json: true,
      resolveWithFullResponse: true
    })
  }

  public async touch (id: string, expiry: number): Promise<TEntity> {
    const document = await this.getById(id)

    if (!document) {
      throw new ValidationError(`Document with id ${id} does not exist`, id)
    }

    const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${this.documentId(
      id
    )}`

    const preparedDocument = {
      ...(document as any),
      _exp: expiry,
      objectType: this.objectType
    }

    return SGRepository.doRequest({
      method: 'PUT',
      uri: uri,
      body: preparedDocument,
      json: true,
      resolveWithFullResponse: true
    })
  }

  public async patch (
    id: string,
    dataToPatch: TPatchEntity,
    patchOptions: GatewayOptions
  ): Promise<TEntity> {
    const expiry = patchOptions.expiry
    const document = await this.getById(id)

    if (!document) {
      throw new ValidationError(`Document with id ${id} does not exist`, id)
    }

    const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${this.documentId(
      id
    )}?rev=${(document as any)._rev}`

    const patchedDocument = _.mergeWith(
      document,
      dataToPatch,
      (_documentValue: TEntity, patchValue: TPatchEntity) => patchValue
    )

    const preparedDocument = {
      ...(patchedDocument as any),
      objectType: this.objectType,
      _exp: expiry,
      updatedAt: timestamp()
    }

    return SGRepository.doRequest({
      method: 'PUT',
      uri: uri,
      body: preparedDocument,
      json: true,
      resolveWithFullResponse: true
    })
  }

  public async getAllIDs () {
    const n1ql = `SELECT META().xattrs._sync, META().id FROM ${this.bucketName}
                  WHERE objectType = \'${this.objectType}\'
                  AND _deleted IS MISSING`

    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(this.n1qlConsistency)

    return new Promise<{ rev: string; id: string }[]>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )

            return reject(new DatabaseError(error.code, errorMsg, null, error))
          }

          const objects = results.map((result: any) => {
            const rev = result._sync.rev
            const obj = {
              id: result.id,
              rev
            }
            return obj
          })

          return resolve(objects)
        }
      )
    })
  }

  /**
   * Purge invitations and container invitations which are send by the user or to the user.
   */
  public async removeByUserIdAndEmail (userID: string, email: string) {
    let uri = `${appDataAdminGatewayURI(
      this.bucketKey
    )}/_changes?filter=sync_gateway/bychannel&channels=${sgUsername(userID)}`

    const docs: any = await SGRepository.doRequest({
      method: 'GET',
      uri: uri,
      json: true,
      resolveWithFullResponse: true,
      simple: false
    })

    const userId = userID.replace('|', '_')
    for (let doc of docs.results) {
      const document = await this.getById(doc.id)
      if (document && (document as any).objectType === this.objectType) {
        const invitingUserID = (document as any).invitingUserID
        if (
          invitingUserID === userId ||
          (document as any).invitedUserEmail === email
        ) {
          await this.purge(doc.id)
        }
      }
    }
  }

  private async removeAll (): Promise<void> {
    const docs = await this.getAllIDs()

    for (let doc of docs) {
      const document = await this.getById(doc.id)
      if (document) {
        const uri = `${appDataAdminGatewayURI(this.bucketKey)}/_bulk_docs`

        const body = {
          docs: [
            {
              ...document,
              _deleted: true
            }
          ]
        }

        await SGRepository.doRequest({
          method: 'POST',
          uri,
          body,
          json: true,
          resolveWithFullResponse: true,
          simple: false
        })
      }
    }
  }

  private documentId (id: string) {
    return id.includes(':') ? id : `${this.objectType}:${id}`
  }

  public async getAttachmentBody (
    documentID: string,
    attachmentID: string
  ): Promise<Buffer | null> {
    const uri = `${appDataAdminGatewayURI(
      this.bucketKey
    )}/${documentID}/${attachmentID}`

    return SGRepository.doRequest({
      method: 'GET',
      uri: uri,
      resolveWithFullResponse: true,
      encoding: null
    })
  }

  public async purge (id: string): Promise<void> {
    const documentId = this.documentId(id)
    const uri = `${appDataAdminGatewayURI(this.bucketKey)}/_purge`

    const body = {
      [documentId] : ['*']
    }

    return SGRepository.doRequest({
      method: 'POST',
      uri: uri,
      json: true,
      body: body,
      resolveWithFullResponse: true,
      simple: false
    })
  }

  /**
   * Direct access to bulkDocs for adding pre-formed SG objects
   */
  public async bulkDocs (docs: any): Promise<void> {
    const uri = `${appDataAdminGatewayURI(this.bucketKey)}/_bulk_docs`

    const body: any = await SGRepository.doRequest({
      method: 'POST',
      uri,
      body: { docs },
      json: true,
      resolveWithFullResponse: true,
      simple: false
    })

    const errors = body.filter((o: any) => o.error)
    if (errors.length > 0) throw new SyncError(`SyncGateway object update(s) failed with errors: \n${errors.map((o: any) => `${o.error} [${o.id}] ${o.reason}`).join('\n')}`,body)

    return body
  }

}
