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
import { v4 as uuid_v4 } from 'uuid'

import { IdentifiableEntity } from './Interfaces/IdentifiableEntity'
import { IndexedRepository, ensureValidDocumentType } from './Interfaces/IndexedRepository'
import { QueryCriteria } from './Interfaces/QueryCriteria'
import { DatabaseError, NoBucketError, NoDocumentMapperError, ValidationError } from '../Errors'
import { QueryOptions } from './Interfaces/QueryOptions'
import { isString } from '../util'
import { SQLDatabase } from './SQLDatabase'
import {
  SchemaDefinition as OttomanSchemaDefinition,
  ModelInstance as OttomanModelInstance,
  ModelInstanceCtor as OttomanModelInstanceCtor,
  ModelOptions as OttomanModelOptions,
} from 'ottoman'
import { BucketKey } from '../Config/ConfigurationTypes'

const registeredSchemas = new Map<string, OttomanModelInstanceCtor>()

import { Prisma } from '@prisma/client'

const getPaths = (obj: any, arr: string[] = [], res: string[][] = []): string[][] => {
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'object' && value) {
      getPaths(value, [...arr, key], res)
    } else {
      res.push([...arr, key])
    }
  })
  return res
}

const deepValue = (o: any, p: string) =>
  p.split('.').reduce((a: { [x: string]: any }, v: string | number) => a[v], o)

/**
 * Manages document persistent storage operations.
 */
export abstract class SQLRepository<
  TEntity,
  TNewEntity extends Partial<IdentifiableEntity>,
  TUpdateEntity extends Partial<IdentifiableEntity>,
  TQueryCriteria extends QueryCriteria
> implements IndexedRepository<TEntity, TNewEntity, TUpdateEntity, TQueryCriteria>
{
  readonly modelConstructor: OttomanModelInstanceCtor

  constructor(readonly database: SQLDatabase) {
    const registeredSchema = registeredSchemas.get(this._documentType)
    // Ignoring the following from tests because testing it is likely to break all the time depending on previously executed tests: requires never having initialized a certain kind of repository before.
    /* istanbul ignore if */
    if (!registeredSchema) {
      if (!this.database.documentMapper) {
        throw new NoDocumentMapperError()
      }

      this.modelConstructor = this.database.documentMapper.model(
        this._documentType,
        this.buildSchemaDefinition(),
        this.buildModelOptions()
      )
      registeredSchemas.set(this._documentType, this.modelConstructor)
    } else {
      this.modelConstructor = registeredSchema
    }
  }

  public get bucketKey(): BucketKey {
    return this.database.bucketKey
  }

  public abstract buildSchemaDefinition(): OttomanSchemaDefinition

  public buildSemiFake(data: any): TEntity {
    return data
  }

  public buildModelOptions(): OttomanModelOptions {
    return {}
  }

  /**
   * Returns document type.
   */
  abstract get documentType(): string

  // This hack works around a TS compiler bug (could not access abstract this.documentType in class constructor)
  private get _documentType(): string {
    return this.documentType
  }

  get model(): OttomanModelInstance<TEntity> {
    if (!this.database) {
      throw new NoBucketError()
    }
    if (!this.database.documentMapper) {
      throw new NoDocumentMapperError()
    }
    return this.database.documentMapper.models[this.documentType]
  }

  get designDocumentName(): string {
    return this.documentType
  }

  /**
   * Convert document into model.
   */
  public buildModel(data: any): TEntity {
    delete data.id
    const mappedModel: any = this.model.fromData(data)

    // make sure mapped model doesn't have property value equals to undefined
    for (const key of Object.keys(mappedModel)) {
      if (mappedModel[key] === undefined) {
        delete mappedModel[key]
      }
    }
    return mappedModel
  }

  public buildPrismaModel(data: any): any {
    const doc = Object.assign({}, data)
    doc.id = doc._id

    for (const key of Object.keys(doc)) {
      if (doc[key] === undefined /* || key.startsWith('_')*/) {
        delete doc[key]
      }
    }

    //doc._id = doc.id

    return {
      id: doc.id,
      data: doc,
    }
  }

  public fixQueryCriteria(criteria: TQueryCriteria | null): any {
    if (!criteria) {
      return {
        data: {
          path: ['_type'],
          equals: this._documentType,
        },
      }
    }

    const query: any = {}
    if (criteria._id) {
      query.id = criteria._id
    }

    const paths = getPaths(criteria)
    if (paths.length) {
      query.AND = []
      if (query.id) {
        query.AND.push({ id: query.id })
        delete query.id
      }
      for (const path of paths) {
        query.AND.push({ data: { path, equals: deepValue(criteria, path.join('.')) } })
      }
    }
    // console.log(999, query)
    return query
  }

  public get bucketName(): string {
    if (!this.database.bucket) {
      throw new NoBucketError()
    }

    return (this.database.bucket as any)._name
  }

  /**
   * Creates new document.
   */
  public async create(newDocument: TNewEntity): Promise<TEntity> {
    if (!this.database.documentMapper) {
      return Promise.reject(new NoDocumentMapperError())
    }

    await this.validateModel(newDocument)
    ensureValidDocumentType(newDocument, this.documentType)

    const id = this.fullyQualifiedId(isString(newDocument._id) ? newDocument._id : uuid_v4())
    newDocument._id = id

    const prismaDoc = this.buildPrismaModel(newDocument)
    // console.log(prismaDoc)
    const createPromise = new Promise<TEntity>((resolve, reject) => {
      this.database.bucket
        .insert(prismaDoc)
        .then(() => resolve(this.buildModel(newDocument)))
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `error when creating object of type ${this.documentType}`,
              JSON.stringify(newDocument)
            )
          )
        )
    })

    return createPromise
  }

  /**
   * Creates new document.
   */
  public async upsert(id: string, newDocument: TNewEntity): Promise<TEntity> {
    if (!this.database.documentMapper) {
      return Promise.reject(new NoDocumentMapperError())
    }

    await this.validateModel(newDocument)
    ensureValidDocumentType(newDocument, this.documentType)

    newDocument._id = id

    const prismaDoc = this.buildPrismaModel(newDocument)
    delete prismaDoc.id

    const createPromise = new Promise<TEntity>((resolve, reject) => {
      this.database.bucket
        .upsert(id, prismaDoc)
        .then(() => resolve(this.buildModel(newDocument)))
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `error when creating object of type ${this.documentType}`,
              JSON.stringify(newDocument)
            )
          )
        )
    })

    return createPromise
  }

  /**
   * Replaces existing document.
   */
  public async update(documentToUpdate: TUpdateEntity): Promise<TEntity> {
    if (!this.database.documentMapper) {
      return Promise.reject(new NoDocumentMapperError())
    }

    const id = documentToUpdate._id
    if (!id) {
      return Promise.reject(new ValidationError('Document has no _id', documentToUpdate))
    }

    ensureValidDocumentType(documentToUpdate, this.documentType)
    await this.validateModel(this.buildSemiFake(documentToUpdate))

    const prismaDoc = this.buildPrismaModel(documentToUpdate)

    return new Promise<TEntity>((resolve, reject) => {
      this.database.bucket
        .replace(id, prismaDoc)
        .then((res: any) => resolve(this.buildModel(res.data)))
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error updating document of type ${this.documentType}`,
              JSON.stringify(documentToUpdate)
            )
          )
        )
    })
  }

  /**
   * Replaces values for the specified keys.
   */
  public async patch(id: string, dataToPatch: Partial<TUpdateEntity>): Promise<TEntity> {
    if (!this.database.documentMapper) {
      return Promise.reject(new NoDocumentMapperError())
    }
    if ('_id' in dataToPatch || '_type' in dataToPatch) {
      return Promise.reject(
        new ValidationError('Document _id and _type can not be patched', dataToPatch)
      )
    }

    dataToPatch._id = id
    return this.update(dataToPatch as TUpdateEntity)
  }

  /**
   * Updates document TTL.
   */
  public async touch(key: string, expiry: number): Promise<void> {
    if (!this.database.bucket) {
      return Promise.reject(new NoBucketError())
    }
    await this.patch(key, { expiry } as any)
  }

  /**
   * Returns single document based on unique id.
   */
  public getById(id: string): Promise<TEntity | null> {
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }
      const query = { id }

      this.database.bucket
        .findUnique(query)
        .then((doc: any) => {
          if (doc) {
            resolve(this.buildModel(doc.data))
          } else {
            resolve(null)
          }
        })
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error getting document by id ${this.documentType}`,
              id
            )
          )
        )
    })
  }

  /**
   * Returns single document based on criteria.
   */
  public getOne(criteria: TQueryCriteria): Promise<TEntity | null> {
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }

      const query = this.fixQueryCriteria(criteria)

      this.database.bucket
        .findFirst(query)
        .then((doc: any) => {
          if (doc) {
            resolve(this.buildModel(doc.data))
          } else {
            resolve(null)
          }
        })
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error getting any document ${this.documentType}`,
              JSON.stringify(criteria)
            )
          )
        )
    })
  }

  /**
   * Returns count of documents based on criteria.
   */
  public count(criteria: TQueryCriteria | null): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }

      const query = this.fixQueryCriteria(criteria)

      this.database.bucket
        .count(query)
        .then((total: number) => resolve(total))
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error counting documents ${this.documentType}`,
              JSON.stringify(criteria)
            )
          )
        )
    })
  }

  /**
   * Returns all document based on criteria.
   */
  public getAll(criteria: TQueryCriteria, _options: QueryOptions | null): Promise<TEntity[]> {
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }

      const query = this.fixQueryCriteria(criteria)

      this.database.bucket
        .findMany(query)
        .then((docs: any) => {
          const finalData: TEntity[] = docs.map((document: any) => {
            return this.buildModel(document.data)
          })

          resolve(finalData)
        })
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error getting documents ${this.documentType}`,
              JSON.stringify(criteria)
            )
          )
        )
    })
  }

  /**
   * Removes existing document.
   */
  public remove(criteria: TQueryCriteria | null): Promise<boolean> {
    //console.log(999, this._documentType)
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }

      const query = this.fixQueryCriteria(criteria)
      this.database.bucket
        .remove(query)
        .then((res: any) => {
          if (res.count) {
            resolve(true)
          } else {
            resolve(false)
          }
        })
        .catch((error: Prisma.PrismaClientKnownRequestError) =>
          reject(
            DatabaseError.fromPrismaError(
              error,
              `Error removing documents ${this.documentType}`,
              JSON.stringify(criteria)
            )
          )
        )
    })
  }

  /**
   * Returns document id schema saved in couchbase.
   */
  fullyQualifiedId(id: string): string {
    return `${this.documentType}|${id}`
  }

  prefixlessId(id: string): string {
    return id.replace(`${this.documentType}|`, '')
  }

  private validateModel(document: Partial<TUpdateEntity> | TNewEntity): Promise<void> {
    // return Promise.resolve()
    if (document.expiry) {
      // todo validate expiry here
      delete document.expiry
    }
    return new Promise<void>((resolve, reject) => {
      this.modelConstructor.schema.validate(this.model.fromData(document), (error) => {
        if (error) {
          // console.log(error.code, error.message, JSON.stringify(document), this.model.fromData(document))
          return reject(
            new DatabaseError(error.code as any, error.message, JSON.stringify(document), error)
          )
        } else {
          return resolve()
        }
      })
    })
  }
}
