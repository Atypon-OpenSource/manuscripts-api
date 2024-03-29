/* eslint-disable */
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

import {Prisma} from '@prisma/client'
import * as HttpStatus from 'http-status-codes'
import * as _ from 'lodash'

import {BucketKey} from '../Config/ConfigurationTypes'
import {DatabaseError, SyncError, ValidationError} from '../Errors'
import {timestamp} from '../Utilities/JWT/LoginTokenPayload'
import {IdentifiableEntity} from './Interfaces/IdentifiableEntity'
import {KeyValueRepository} from './Interfaces/KeyValueRepository'
import {SQLDatabase} from './SQLDatabase'
import {validate} from '@manuscripts/json-schema'

export abstract class SGRepository<
  TEntity extends Partial<IdentifiableEntity>,
  TNewEntity,
  TUpdateEntity extends Partial<IdentifiableEntity>,
  TPatchEntity
> implements KeyValueRepository<TEntity, TNewEntity, TUpdateEntity, TPatchEntity>
{
  abstract get objectType(): string

  constructor(readonly bucketKey: BucketKey, readonly database: SQLDatabase) {}

  /**
   * Returns document type.
   */
  public get documentType(): void {
    return
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
  public async create(newDocument: TNewEntity, userId?: string): Promise<TEntity> {
    const docId = this.documentId((newDocument as any)._id)
    const createdAt = timestamp()

    const prismaDoc = {
      _id: docId,
      data: {
        objectType: this.objectType,
        updatedAt: createdAt,
        createdAt,
        ...(newDocument as any),
        _id: docId,
      },
    } as any

    if (userId) {
      try {
        await this.validate({ ...prismaDoc.data }, null)
      } catch (e) {
        throw new SyncError(e.forbidden, {})
      }
    }

    return new Promise<TEntity>((resolve, reject) => {
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
  }

  /**
   * Returns single document based on unique id.
   */
  public async getById(id: string): Promise<TEntity | null> {
    return new Promise((resolve, reject) => {
      const query = { id: this.documentId(id) }

      this.database.bucket
        .findUnique(query)
        .then(async (res: any) => {
          if (res) {
            const doc = this.buildModel(res)
            return resolve(doc)
          }
          resolve(null)
        })
        .catch((error: any) => {
          if (error.forbidden) {
            return reject(new SyncError(error.forbidden, {}))
          }
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error getting document by id ${this.objectType}`,
              id
            )
          )
        })
    })
  }

  /**
   * Removes existing document.
   */
  public async remove(id: string | null, userId?: string): Promise<void> {
    if (id === null) {
      return this.removeAll()
    }

    const query = { id: this.documentId(id) }
    if (userId) {
      await this.getById(query.id)
    }

    return new Promise((resolve, reject) => {
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
  public async update(updatedDocument: TUpdateEntity): Promise<TEntity> {
    const docId = this.documentId(updatedDocument._id as any)


    const documentToUpdate = {
      _id: docId,
      data: {
        updatedAt: timestamp(),
        ...updatedDocument,
      },
    } as any

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

  public async touch(id: string, expiry: number, userId?: string): Promise<TEntity> {
    return this.patch(id, { expiry } as any, userId)
  }

  public async patch(id: string, dataToPatch: TPatchEntity, userId?: string): Promise<TEntity> {
    const docId = this.documentId(id)
    let document
    try {
      document = await this.getById(docId)
    } catch (e) {
      if (e.name === 'SyncError') {
        throw new SyncError(e.forbidden, {})
      }
    }

    if (!document) {
      throw new ValidationError(`Document with id ${id} does not exist`, id)
    }

    const patchedDocument = _.mergeWith(
      document,
      dataToPatch,
      (_documentValue: any, patchValue: any) => patchValue
    ) as any

    if (patchedDocument.objectType !== this.objectType) {
      throw new ValidationError(`Object type mismatched`, patchedDocument.objectType)
    }

    if (userId) {
      try {
        await this.validate({ ...patchedDocument }, { ...document })
      } catch (e) {
        if (e.forbidden) {
          throw new SyncError(e.forbidden, {})
        }
      }
    }

    return this.update(patchedDocument)
  }

  /**
   * Purge invitations and container invitations which are send by the user or to the user.
   */
  public async removeByUserIdAndEmail(userID: string, email: string) {
    const q = {
      AND: [
        {
          data: {
            path: ['objectType'],
            equals: this.objectType,
          },
        },
        {
          OR: [
            {
              data: {
                path: ['invitedUserEmail'],
                equals: email,
              },
            },
            {
              data: {
                path: ['invitingUserID'],
                equals: userID /*userID.replace('|', '_')*/,
              },
            },
          ],
        },
      ],
    }
    await this.database.bucket.remove(q)
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

  /* istanbul ignore next */
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
    await this.remove(id)
  }

  /**
   * Direct access to bulkDocs for adding pre-formed SG objects
   */
  public async bulkUpsert(docs: any, userId?: string): Promise<any[]> {
    const promises = []
    for (const doc of docs) {
      const docId = this.documentId(doc._id)
      const dataToPatch = _.omit(doc, ['_id', 'id', 'data'])
      promises.push(
        this.patchSafe(docId, dataToPatch, userId).catch((err) => {
          if (err.statusCode === HttpStatus.BAD_REQUEST || err.forbidden) {
            return this.create(doc, userId)
          }
        })
      )
    }

    return Promise.all(promises)
  }

  public async bulkInsert(docs: any): Promise<any> {
    const batch = []
    for (const doc of docs) {
      batch.push({ id: doc._id, data: doc })
    }

    return this.database.bucket.insertMany(batch)
  }

  /**
   * same as patch/update but without objectType validation
   * used by bulkDocs only
   */
  public async patchSafe(id: string, dataToPatch: TPatchEntity, userId?: string): Promise<TEntity> {
    const docId = this.documentId(id)
    let document
    try {
      document = await this.getById(docId)
    } catch (e) {
      if (e.name === 'SyncError') {
        throw new SyncError(e.forbidden, {})
      }
    }

    if (!document) {
      throw new ValidationError(`Document with id ${id} does not exist`, id)
    }

    const patchedDocument = _.mergeWith(
      document,
      dataToPatch,
      (_documentValue: any, patchValue: any) => patchValue
    ) as any

    if (userId) {
      try {
        await this.validate({ ...patchedDocument }, { ...document })
      } catch (e) {
        if (e.forbidden) {
          throw new SyncError(e.forbidden, {})
        }
      }
    }

    return this.update(patchedDocument)
  }

  /**
   * Get expired documents
   */
  public getExpired(): Promise<TEntity[]> {
    const Q = {
      AND: [
        {
          data: {
            path: ['expiry'],
            lte: timestamp(),
          },
        },
        {
          data: {
            path: ['objectType'],
            equals: this.objectType,
          },
        },
      ],
    }
    return new Promise((resolve, reject) => {
      this.database.bucket
        .query(Q)
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error getting expired documents ${this.objectType}`,
              JSON.stringify(Q)
            )
          )
        )
        .then((docs: any) => {
          const res = docs.map((doc: any) => {
            return this.buildModel(doc)
          })
          resolve(res)
        })
    })
  }

  private validate(doc: any, oldDoc: any): void {
    if (doc.expiry) {
      delete doc.expiry
    }
    if (oldDoc && oldDoc.expiry) {
      delete oldDoc.expiry
    }

    if (!doc._id) {
      throw { forbidden: 'missing _id' }
    }

    if (doc.objectType && doc._id.substr(0, doc._id.indexOf(':')) !== doc.objectType) {
      throw { forbidden: '_id must have objectType as prefix' }
    }

    // check that the update isn't mutating objectType
    if (oldDoc && oldDoc.objectType !== doc.objectType) {
      // prettier-ignore
      throw({ forbidden: 'objectType cannot be mutated' });
    }

    if (oldDoc && oldDoc.containerID !== doc.containerID) {
      // prettier-ignore
      throw({ forbidden: 'containerID cannot be mutated' });
    }

    const errorMessage = validate(doc)

    if (errorMessage) {
      // prettier-ignore
      throw({ forbidden: errorMessage });
    }
  }
}
