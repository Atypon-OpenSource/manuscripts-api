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

import * as _ from 'lodash'
import { ValidationError, DatabaseError, NoBucketError } from '../Errors'
import { KeyValueRepository, GatewayOptions } from './Interfaces/KeyValueRepository'
import { BucketKey } from '../Config/ConfigurationTypes'
import { SQLDatabase } from './SQLDatabase'
import { timestamp } from '../Utilities/JWT/LoginTokenPayload'

import { Prisma } from '@prisma/client'

export abstract class SGRepository<TEntity, TNewEntity, TUpdateEntity, TPatchEntity>
  implements KeyValueRepository<TEntity, TNewEntity, TUpdateEntity, TPatchEntity>
{
  abstract get objectType(): string

  constructor(readonly bucketKey: BucketKey, readonly database: SQLDatabase) {}

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
    // const expiry = createOptions.expiry
    const createdAt = timestamp()

    const prismaDoc = {
      _id: docId,
      data: {
        objectType: this.objectType,
        updatedAt: createdAt,
        createdAt,
        ...(newDocument as any),
      },
    } as unknown as TEntity

    const createPromise = new Promise<TEntity>((resolve, reject) => {
      this.database.bucket
        .insert(this.buildPrismaModel(prismaDoc))
        .then(() => resolve(this.buildModel(prismaDoc)))
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `error when creating object of type ${this.objectType}`,
              JSON.stringify(newDocument)
            )
          )
        )
    })

    return createPromise
  }

  /**
   * Returns single document based on unique id.
   */
  public async getById(id: string): Promise<TEntity | null> {
    return new Promise((resolve, reject) => {
      const query = { id: this.documentId(id) }

      this.database.bucket
        .findUnique(query)
        .then((doc: any) => {
          //console.log(11333, doc)
          if (doc) {
            resolve(this.buildModel(doc))
          } else {
            resolve(null)
          }
        })
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error getting document by id ${this.objectType}`,
              id
            )
          )
        )
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
        .then(() => resolve())
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error removing documents ${this.documentType}`,
              JSON.stringify(query)
            )
          )
        )
    })
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
        .then(() => resolve(this.buildModel(documentToUpdate)))
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error updating document of type ${this.objectType}`,
              JSON.stringify(documentToUpdate)
            )
          )
        )
    })
  }

  public async touch(id: string, expiry: number): Promise<TEntity> {
    return this.patch(id, { expiry } as any, {})
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

    const patchedDocument = _.mergeWith(
      document,
      dataToPatch,
      (_documentValue: any, patchValue: any) => patchValue
    ) as any

    return this.update(docId, patchedDocument, patchOptions)
  }

  /**
   * Purge invitations and container invitations which are send by the user or to the user.
   */
  public async removeByUserIdAndEmail(_userID: string, _email: string) {
    /*let uri = `${appDataAdminGatewayURI(
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
    }*/
  }

  private async removeAll(): Promise<void> {
    const q = {
      data: {
        path: ['objectType'],
        equals: this.objectType,
      },
    }
    await this.database.bucket.remove(q)
  }

  private documentId(id: string) {
    return id.includes(':') ? id : `${this.objectType}:${id}`
  }

  public async getAttachmentBody(
    _documentID: string,
    _attachmentID: string
  ): Promise<Buffer | null> {
    /*const uri = `${appDataAdminGatewayURI(this.bucketKey)}/${documentID}/${attachmentID}`

    return SGRepository.doRequest({
      method: 'GET',
      uri: uri,
      resolveWithFullResponse: true,
      encoding: null,
    })*/
    return null
  }

  public async purge(id: string): Promise<void> {
    await this.database.bucket.remove({ id })
  }

  /**
   * Direct access to bulkDocs for adding pre-formed SG objects
   */
  public async bulkDocs(docs: any): Promise<any[]> {
    const updated = []
    for (const doc of docs) {
      const docId = this.documentId(doc._id)
      const dataToPatch = _.omit(doc, ['_id', 'id', 'data'])
      const updatedDoc = await this.patch(docId, dataToPatch, {}).catch((err) => {
        if (err.statusCode === 400) {
          // must upsert
          return this.database.bucket.upsert(docId, { data: dataToPatch })
        }
      })

      updated.push(updatedDoc)
    }

    return updated
  }
}
