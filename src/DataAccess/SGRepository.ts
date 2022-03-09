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
import { N1qlQuery /*, CouchbaseError*/ } from 'couchbase'
import { appDataAdminGatewayURI } from '../Config/ConfigAccessors'
import {
  ValidationError,
  SyncError,
  DatabaseError,
  NoBucketError,
  GatewayInaccessibleError,
} from '../Errors'
import { KeyValueRepository, GatewayOptions } from './Interfaces/KeyValueRepository'
import { username as sgUsername } from '../DomainServices/Sync/SyncService'
import { BucketKey } from '../Config/ConfigurationTypes'
import { SQLDatabase } from './SQLDatabase'
// import { databaseErrorMessage } from './DatabaseResponseFunctions'
import { timestamp } from '../Utilities/JWT/LoginTokenPayload'

import { Prisma } from '@prisma/client'

export abstract class SGRepository<TEntity, TNewEntity, TUpdateEntity, TPatchEntity>
  implements KeyValueRepository<TEntity, TNewEntity, TUpdateEntity, TPatchEntity>
{
  abstract get objectType(): string

  readonly n1qlConsistency: N1qlQuery.Consistency

  constructor(
    readonly bucketKey: BucketKey,
    readonly database: SQLDatabase,
    n1qlConsistency: N1qlQuery.Consistency = N1qlQuery.Consistency.REQUEST_PLUS
  ) {
    this.n1qlConsistency = n1qlConsistency
  }

  /**
   * Returns document type.
   */
  public get documentType(): void {
    return
  }

  public get bucketName(): string {
    if (!this.database.bucket) {
      throw new NoBucketError()
    }

    return (this.database.bucket as any)._name
  }

  static async doRequest(options: any) {
    let response: any
    try {
      response = await request(options)
    } catch (error) {
      if (error.statusCode === HttpStatus.SERVICE_UNAVAILABLE) {
        throw new GatewayInaccessibleError(options.uri)
      }

      throw new SyncError(`Request to URL ${options.uri} failed`, response && response.body)
    }

    if (options.method === 'GET' && response.statusCode === HttpStatus.NOT_FOUND) {
      return null
    }

    if (response.statusCode === HttpStatus.CREATED || response.statusCode === HttpStatus.OK) {
      return response.body
    }

    throw new SyncError('SyncGateway object creation failed.', response.body)
  }

  public buildPrismaModel(data: any): any {
    const doc = Object.assign({}, data)
    doc.id = doc._id

    for (const key of Object.keys(doc)) {
      if (doc[key] === undefined || key.startsWith('_')) {
        delete doc[key]
      }
    }

    return doc
  }

  public buildModel(data: any): any {
    // data._id = data.id
    // delete data.id

    if (data.data) {
      data.data._id = data.id || data._id
    }
    return data.data
  }

  /**
   * Creates new document.
   */
  public async create(newDocument: TNewEntity, _createOptions: GatewayOptions): Promise<TEntity> {
    const docId = this.documentId((newDocument as any)._id)
    // const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${docId}`
    // const expiry = createOptions.expiry
    const createdAt = timestamp()

    /*const preparedDocument = {
      ...(newDocument as any),
      _id: docId,
      objectType: this.objectType,
      updatedAt: createdAt,
      createdAt,
      _exp: expiry
    }*/

    const prismaDoc = {
      _id: docId,
      data: {
        objectType: this.objectType,
        updatedAt: createdAt,
        createdAt,
        ...(newDocument as any),
      },
    } as unknown as TEntity
    // console.log(999,  prismaDoc)
    const createPromise = new Promise<TEntity>((resolve, reject) => {
      this.database.bucket
        .insert(this.buildPrismaModel(prismaDoc))
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `error when creating object of type ${this.objectType}`,
              JSON.stringify(newDocument)
            )
          )
        )
        .then(() => resolve(this.buildModel(prismaDoc)))
    })

    return createPromise

    /*return SGRepository.doRequest({
      method: 'PUT', // This way if the object exist in a _deleted form, it will upsert the object, creating a new one with the same _id.
      uri,
      body: preparedDocument,
      json: true,
      resolveWithFullResponse: true,
      simple: false
    })*/
  }

  /**
   * Returns single document based on unique id.
   */
  public async getById(id: string): Promise<TEntity | null> {
    return new Promise((resolve, reject) => {
      const query = { id: this.documentId(id) }

      this.database.bucket
        .findUnique(query)
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error getting document by id ${this.objectType}`,
              id
            )
          )
        )
        .then((doc: any) => {
          // console.log(11333, this.objectType, id, this.documentId(id), query, doc)
          if (doc) {
            resolve(this.buildModel(doc))
          } else {
            resolve(null)
          }
        })
    })
    /*const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${this.documentId(
      id
    )}`
    return SGRepository.doRequest({
      method: 'GET',
      uri: uri,
      json: true,
      resolveWithFullResponse: true,
      simple: false
    })*/
  }

  /**
   * Removes existing document.
   */
  public async remove(id: string | null): Promise<void> {
    if (id === null) {
      return this.removeAll()
    }

    return new Promise((resolve, reject) => {
      const query = { id: this.documentId(id) }

      this.database.bucket
        .remove(query)
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error removing documents ${this.documentType}`,
              JSON.stringify(query)
            )
          )
        )
        .then(() => resolve())
    })

    /*const document = await this.getById(id)
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
    }*/
  }

  /**
   * Replaces existing document.
   */
  public async update(
    id: string,
    updatedDocument: TUpdateEntity,
    _updateOptions: GatewayOptions
  ): Promise<TEntity> {
    const docId = this.documentId(id)
    const document = await this.getById(docId)

    if (!document) {
      throw new ValidationError(`Document with id ${id} does not exist`, id)
    }

    /*const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${this.documentId(
      id
    )}?rev=${(document as any)._rev}`*/

    if ((document as any).objectType !== this.objectType) {
      throw new ValidationError(`Object type mismatched`, (updatedDocument as any).objectType)
    }
    // const expiry = updateOptions.expiry

    const documentToUpdate = {
      _id: docId,
      data: {
        objectType: this.objectType,
        updatedAt: timestamp(),
        ...(updatedDocument as any),
      },
    } as unknown as TEntity

    const prismaDoc = this.buildPrismaModel(documentToUpdate)

    return new Promise<TEntity>((resolve, reject) => {
      this.database.bucket
        .replace(docId, prismaDoc)
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error updating document of type ${this.objectType}`,
              JSON.stringify(documentToUpdate)
            )
          )
        )
        .then(() => resolve(this.buildModel(documentToUpdate)))
    })
    /*const preparedDocument = {
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
    })*/
  }

  public async touch(id: string, expiry: number): Promise<TEntity> {
    return this.patch(id, { expiry } as any, {})
    /*const document = await this.getById(id)

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
    })*/
  }

  public async patch(
    id: string,
    dataToPatch: TPatchEntity,
    patchOptions: GatewayOptions
  ): Promise<TEntity> {
    // const expiry = patchOptions.expiry
    const docId = this.documentId(id)
    const document = await this.getById(docId)

    if (!document) {
      throw new ValidationError(`Document with id ${id} does not exist`, id)
    }

    /*const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${this.documentId(
      id
    )}?rev=${(document as any)._rev}`*/
    /*const patchedDocument = _.mergeWith(
      document.data,
      this.buildPrismaModel(dataToPatch).data,
      (_documentValue: TEntity, patchValue: TPatchEntity) => patchValue
    )*/

    const patchedDocument = _.mergeWith(
      document,
      dataToPatch,
      (_documentValue: any, patchValue: any) => patchValue
    ) as any

    return this.update(docId, patchedDocument, patchOptions)

    /*const preparedDocument = {
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
    })*/
  }

  /*public async getAllIDs () {
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
  }*/

  /**
   * Purge invitations and container invitations which are send by the user or to the user.
   */
  public async removeByUserIdAndEmail(userID: string, email: string) {
    let uri = `${appDataAdminGatewayURI(
      this.bucketKey
    )}/_changes?filter=sync_gateway/bychannel&channels=${sgUsername(userID)}`

    const docs: any = await SGRepository.doRequest({
      method: 'GET',
      uri: uri,
      json: true,
      resolveWithFullResponse: true,
      simple: false,
    })

    const userId = userID.replace('|', '_')
    for (let doc of docs.results) {
      const document = await this.getById(doc.id)
      if (document && (document as any).objectType === this.objectType) {
        const invitingUserID = (document as any).invitingUserID
        if (invitingUserID === userId || (document as any).invitedUserEmail === email) {
          await this.purge(doc.id)
        }
      }
    }
  }

  private async removeAll(): Promise<void> {
    await this.database.bucket.remove({})
    /*const docs = await this.getAllIDs()

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
    }*/
  }

  private documentId(id: string) {
    return id.includes(':') ? id : `${this.objectType}:${id}`
  }

  public async getAttachmentBody(documentID: string, attachmentID: string): Promise<Buffer | null> {
    const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${documentID}/${attachmentID}`

    return SGRepository.doRequest({
      method: 'GET',
      uri: uri,
      resolveWithFullResponse: true,
      encoding: null,
    })
  }

  public async purge(id: string): Promise<void> {
    await this.database.bucket.remove({ id })
    /*const documentId = this.documentId(id)
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
    })*/
  }

  /**
   * Direct access to bulkDocs for adding pre-formed SG objects
   */
  public async bulkDocs(docs: any): Promise<void> {
    for (const doc of docs) {
      const docId = this.documentId(doc._id)
      const dataToPatch = _.omit(doc, ['_id', 'id', 'data'])
      // console.log(docId, dataToPatch)
      await this.patch(docId, dataToPatch, {}).catch(async (err) => {
        if (err.statusCode === 400) {
          // must upsert
          await this.database.bucket.upsert(docId, { data: dataToPatch })
        }
      })
    }

    /*const uri = `${appDataAdminGatewayURI(this.bucketKey)}/_bulk_docs`

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

    return body*/
  }
}
