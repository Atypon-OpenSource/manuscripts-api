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

import { N1qlQuery, N1qlStringQuery, CouchbaseError } from 'couchbase'
import * as _ from 'lodash'
import checksum from 'checksum'
import { v4 as uuid_v4 } from 'uuid'

import { IdentifiableEntity } from './Interfaces/IdentifiableEntity'
import { IndexedRepository, ensureTypeBound, ensureValidDocumentType, CreateOptions, UpdateOptions, PatchOptions } from './Interfaces/IndexedRepository'
import { QueryFragment } from './Interfaces/QueryFragment'
import { QueryCriteria } from './Interfaces/QueryCriteria'
import { DatabaseError, NoBucketError, NoDocumentMapperError, RecordNotFoundError, NumericalError, ValidationError, SecondaryIndexMissingError } from '../Errors'
import { QueryOptions } from './Interfaces/QueryOptions'
import { isNumber, isString } from '../util'
import { Database } from './Database'
import { SchemaDefinition as OttomanSchemaDefinition, ModelInstance as OttomanModelInstance, ModelInstanceCtor as OttomanModelInstanceCtor, ModelOptions as OttomanModelOptions } from 'ottoman'
import { DatabaseView, DatabaseDesignDocument } from './DatabaseView'
import { databaseErrorMessage } from './DatabaseResponseFunctions'
import { Environment, BucketKey } from '../Config/ConfigurationTypes'

const registeredSchemas = new Map<string, OttomanModelInstanceCtor>()

/**
 * Manages document persistent storage operations.
 */
export abstract class CBRepository<TEntity,
                              TNewEntity extends Partial<IdentifiableEntity>,
                              TUpdateEntity extends Partial<IdentifiableEntity>,
                              TQueryCriteria extends QueryCriteria>
  implements IndexedRepository<TEntity, TNewEntity, TUpdateEntity, TQueryCriteria> {

  readonly consistency: N1qlQuery.Consistency

  readonly modelConstructor: OttomanModelInstanceCtor

  constructor (readonly database: Database, consistency: N1qlQuery.Consistency = N1qlQuery.Consistency.STATEMENT_PLUS) {
    this.consistency = consistency
    const registeredSchema = registeredSchemas.get(this._documentType)
    // Ignoring the following from tests because testing it is likely to break all the time depending on previously executed tests: requires never having initialized a certain kind of repository before.
    /* istanbul ignore if */
    if (!registeredSchema) {
      if (!this.database.documentMapper) {
        throw new NoDocumentMapperError()
      }

      this.modelConstructor = this.database.documentMapper.model(this._documentType, this.buildSchemaDefinition(), this.buildModelOptions())
      registeredSchemas.set(this._documentType, this.modelConstructor)
    } else {
      this.modelConstructor = registeredSchema
    }
  }

  public get bucketKey (): BucketKey { return this.database.bucketKey }

  public abstract buildSchemaDefinition (): OttomanSchemaDefinition

  public buildModelOptions (): OttomanModelOptions { return {} }

  public buildViews (): ReadonlyArray<DatabaseView> { return [] }

  /**
   * Returns document type.
   */
  abstract get documentType (): string

  // This hack works around a TS compiler bug (could not access abstract this.documentType in class constructor)
  private get _documentType (): string { return this.documentType }

  get model (): OttomanModelInstance<TEntity> {
    if (!this.database) { throw new NoBucketError() }
    if (!this.database.documentMapper) { throw new NoDocumentMapperError() }
    return this.database.documentMapper.models[this.documentType]
  }

  get designDocumentName (): string {
    return this.documentType
  }

  /**
   * Build a query fragment suitable as a suffix immediately after "WHERE " in a N1QL query.
   * Includes a fixed criterion: _type = ${this.documentType}.
   */
  public whereClause (criteria: QueryCriteria | null): QueryFragment {
    if (!criteria) {
      return { N1QL: '_type = $1', params: [this.documentType] }
    }

    const sortedKeys = Object.keys(criteria).sort()

    // include criteria key-value pairs as is (k = v).
    let frags = sortedKeys.map((key, i) => {
      if (process.env.NODE_ENV !== Environment.Production) {
        // id gets turned below to _id below, hence checking for both here.
        const isPrimaryKey = key === '_id'
        const indices = !isPrimaryKey ? this.buildModelOptions().index : undefined
        if (!isPrimaryKey && indices) {
          const isFieldIndexed = Object.keys(indices).filter((index: any) => indices[index].by === key).length > 0
          if (!isFieldIndexed) {
            throw new SecondaryIndexMissingError(this.documentType, key)
          }
        } else if (!isPrimaryKey) {
          throw new SecondaryIndexMissingError(this.documentType, key)
        }
      }

      return `${key} = $${i + 1}`
    })

    // add fixed parameterization: _type = `this.documentType`
    frags.push(`_type = $${frags.length + 1}`)

    let params = sortedKeys.map(k => criteria[k])
    params.push(this.documentType)

    return {
      N1QL: frags.join(' AND '),
      params: params
    }
  }

  /**
   * Convert document into model.
   */
  public buildModel (data: any): TEntity {
    const mappedModel: any = this.model.fromData(data)

    // make sure mapped model doesn't have property value equals to undefined
    for (const key of Object.keys(mappedModel)) {
      if (mappedModel[key] === undefined) {
        delete mappedModel[key]
      }
    }
    return mappedModel
  }

  public get bucketName (): string {
    if (!this.database.bucket) {
      throw new NoBucketError()
    }

    return (this.database.bucket as any)._name
  }

  /**
   * Creates new document.
   */
  public async create (
    newDocument: TNewEntity,
    options: CreateOptions
  ): Promise<TEntity> {
    if (!this.database.documentMapper) {
      throw new NoDocumentMapperError()
    }

    await this.validateModel(newDocument)
    ensureValidDocumentType(newDocument, this.documentType)

    const id = this.fullyQualifiedId(isString(newDocument._id) ? newDocument._id : uuid_v4())
    newDocument._id = id

    const createPromise = new Promise<TEntity>((resolve, reject) => {
      this.database.bucket.insert(id, newDocument, options, error => {
        if (error) {
          return reject(DatabaseError.fromPotentiallyNumericalError(error, `error when creating object of type ${this.documentType}`, JSON.stringify(newDocument)))
        }
        resolve(this.buildModel(newDocument))
      })
    })

    return createPromise
  }

  /**
   * Replaces existing document.
   */
  public async update (
    documentToUpdate: TUpdateEntity,
    options: UpdateOptions
  ): Promise<TEntity> {
    if (!this.database.documentMapper) {
      throw new NoDocumentMapperError()
    }

    const id = documentToUpdate._id
    if (!id) {
      throw new ValidationError('Document has no _id', documentToUpdate)
    }

    ensureValidDocumentType(documentToUpdate, this.documentType)
    await this.validateModel(documentToUpdate)

    return new Promise<TEntity>((resolve, reject) => {
      this.database.bucket.replace(id, documentToUpdate, options, (error, _res) => {
        if (error) {
          return reject(DatabaseError.fromPotentiallyNumericalError(error, `Error updating document of type ${this.documentType}`, JSON.stringify(documentToUpdate)))
        }

        const newData = this.buildModel(documentToUpdate)
        return resolve(newData)
      })
    })
  }

  /**
   * Replaces values for the specified keys.
   */
  public async patch (
    id: string,
    dataToPatch: Partial<TUpdateEntity>,
    options: PatchOptions
  ): Promise<TEntity> {
    if (!this.database.documentMapper) {
      throw new NoDocumentMapperError()
    }
    if ('_id' in dataToPatch || '_type' in dataToPatch) {
      throw new ValidationError('Document _id and _type can not be patched', dataToPatch)
    }

    const document = await new Promise<any>((resolve, reject) => {
      const n1ql = `SELECT * FROM \`${this.bucketName}\` WHERE _type = '${this.documentType}' AND _id = $1 LIMIT 1;`
      const statement = ensureTypeBound(N1qlQuery.fromString(n1ql).adhoc(false).consistency(this.consistency))

      this.database.bucket.query(statement, [id], (error: CouchbaseError | null, result: any) => {
        if (error) {
          const errorMsg: string = databaseErrorMessage(error.code, error.message)

          return reject(new DatabaseError(error.code, errorMsg, `${id}`, error))
        }

        if (result.length) {
          return resolve(result[0][this.bucketName])
        } else {
          return reject(new RecordNotFoundError(id))
        }
      }
      )
    })

    Object.assign(document, dataToPatch)

    await this.validateModel(document)

    return new Promise<TEntity>((resolve, reject) => {
      this.database.bucket.upsert(document ._id, document, options, (error: CouchbaseError | number | null, _result: OttomanModelInstance<TEntity> | undefined) => {
        if (error) {
          return reject(DatabaseError.fromPotentiallyNumericalError(error, `patching document of type ${this.documentType} failed`, JSON.stringify({ _id: id, dataToPatch })))
        }

        const finalData: TEntity = this.buildModel(document)

        resolve(finalData)
      })
    })
  }

  /**
   * Updates document TTL.
   */
  public touch (key: string, expiry: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }

      this.database.bucket.touch(key, expiry, {}, (error: CouchbaseError | null, _cas: any) => {
        if (error) {
          if (isNumber(error)) {
            return reject(
              new DatabaseError(
                error,
                databaseErrorMessage(
                  error,
                  `Couchbase error with code ${error} occurred.`
                ),
                key,
                new NumericalError(error)
              )
            )
          } else {
            const errorMsg: string = databaseErrorMessage(error.code, error.message)
            return reject(new DatabaseError(error.code, errorMsg, key, error))
          }
        }

        // touch no longer returns the document contents for the key in current versions of the Couchbase SDK.
        // the 'CAS' value returned (the last arg in the callback) is one of these:
        // https://docs.couchbase.com/dotnet-sdk/2.2/check-and-swap.html
        // … hence we just resolve without returning a value if an error was not thrown.
        resolve()
      })
    })
  }

  /**
   * Returns single document based on unique id.
   */
  public getById (id: string): Promise<TEntity | null> {
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }
      const n1ql = `SELECT * FROM \`${this.bucketName}\` WHERE _type = '${this.documentType}' AND _id = $1 LIMIT 1;`

      const statement = ensureTypeBound(N1qlQuery.fromString(n1ql)
                                                 .adhoc(false)
                                                 .consistency(this.consistency))
      this.database.bucket.query(
        statement,
        [id],
        (error: CouchbaseError | null, result: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(error.code, error.message)

            return reject(new DatabaseError(error.code, errorMsg, `${id}`, error))
          }

          if (result.length) {
            const finalData: TEntity = this.buildModel(result[0][this.bucketName])

            resolve(finalData)
          } else {
            resolve(null)
          }
        }
      )
    })
  }

  /**
   * Returns single document based on criteria.
   */
  public getOne (criteria: TQueryCriteria): Promise<TEntity | null> {
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }

      const where = this.whereClause(criteria)
      const n1ql = `SELECT * FROM \`${this.bucketName}\` WHERE ${where.N1QL} LIMIT 1;`
      const statement = ensureTypeBound(N1qlQuery.fromString(n1ql)
                                                 .adhoc(false)
                                                 .consistency(this.consistency))

      this.database.bucket.query(
        statement,
        where.params,
        (error: CouchbaseError | null, result: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(error.code, error.message)

            return reject(new DatabaseError(error.code, errorMsg, `${JSON.stringify(criteria)}`, error))
          }

          if (result.length) {
            const finalData: TEntity = this.buildModel(result[0][this.bucketName])

            resolve(finalData)
          } else {
            resolve(null)
          }
        }
      )
    })
  }

  /**
   * Returns count of documents based on criteria.
   */
  public count (criteria: TQueryCriteria | null): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }

      const where = this.whereClause(criteria)
      const n1ql = `SELECT COUNT(1) FROM \`${this.bucketName}\` WHERE ${where.N1QL};`
      const statement = ensureTypeBound(N1qlQuery.fromString(n1ql)
                                                 .adhoc(false)
                                                 .consistency(this.consistency))

      this.database.bucket.query(
        statement,
        where.params,
        (error: CouchbaseError | null, result: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(error.code, error.message)
            return reject(new DatabaseError(error.code, errorMsg, JSON.stringify(criteria), error))
          }
          resolve(result[0].$1)
        }
      )
    })
  }

  /**
   * Returns all document based on criteria.
   */
  public getAll (criteria: TQueryCriteria, options: QueryOptions | null): Promise<TEntity[]> {
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }

      const where = this.whereClause(criteria)
      const statement = ensureTypeBound(this.getAllQuery(where, options)
                                            .adhoc(false)
                                            .consistency(this.consistency))

      this.database.bucket.query(
        statement,
        where.params,
        (error: CouchbaseError | null, result: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(error.code, error.message)
            return reject(new DatabaseError(error.code, errorMsg, JSON.stringify(criteria), error))
          }

          const finalData: TEntity[] = result.map((document: any) => {
            return this.buildModel(document[this.bucketName])
          })

          resolve(finalData)
        }
      )
    })
  }

  /**
   * Removes existing document.
   */
  public remove (criteria: TQueryCriteria | null): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.database.bucket) {
        throw new NoBucketError()
      }

      const where = this.whereClause(criteria)
      const n1ql = `DELETE FROM \`${this.bucketName}\` WHERE ${where.N1QL} RETURNING *;`
      const statement = ensureTypeBound(N1qlQuery.fromString(n1ql)
                                                 .adhoc(false)
                                                 .consistency(this.consistency))

      this.database.bucket.query(
        statement,
        where.params,
        (error: CouchbaseError | null, result: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(error.code, error.message)
            return reject(new DatabaseError(error.code, errorMsg, JSON.stringify(criteria), error))
          }
          if (result.length) {
            resolve(true)
          } else {
            resolve(false)
          }
        }
      )
    })
  }

  /**
   * Returns document id schema saved in couchbase.
   */
  fullyQualifiedId (id: string): string {
    return `${this.documentType}|${id}`
  }

  prefixlessId (id: string): string {
    return id.replace(`${this.documentType}|`, '')
  }

  public getAllQuery (whereClause: QueryFragment | null, options: QueryOptions | null): N1qlStringQuery {

    const where = whereClause ? whereClause.N1QL : `_type = '${this.documentType}`

    const offsetStr = (options && options.skip) ? `OFFSET ${options.skip}` : ''
    const limitStr = (options && options.limit && options.limit > 0) ? `LIMIT ${options.limit}` : ''

    const orderByStr = (() => {
      if (!options) { return '' }
      if (options.ascOrderBy.length > 0 && options.descOrderBy.length > 0) {
        return `ORDER BY ${options.ascOrderBy.join()} ASC, ${options.descOrderBy.join()} DESC`
      }
      if (options.ascOrderBy.length > 0) {
        return `ORDER BY ${options.ascOrderBy.join()} ASC`
      }
      if (options.descOrderBy.length > 0) {
        return `ORDER BY ${options.descOrderBy.join()} DESC`
      }
      return ''
    })()

    const n1ql = `SELECT * FROM \`${this.bucketName}\` WHERE ${where} ${offsetStr} ${limitStr} ${orderByStr}`.trimRight()
    const statement = ensureTypeBound(N1qlQuery.fromString(n1ql)
                                                .adhoc(false)
                                                .consistency(this.consistency))

    return statement
  }

  public async pushDesignDocument (): Promise<void> {
    const newDesignDocument = this.buildDesignDocument()
    let databaseDesignDocument = await this.database.getDesignDocument(newDesignDocument.name)

    if (!databaseDesignDocument || !databaseDesignDocument.viewsStatus) { // design document not found (new one), then it should be created
      databaseDesignDocument = {
        name: newDesignDocument.name,
        viewsStatus: {},
        views: {}
      }
    }

    const currentViewStatusChecksum = Object.keys(databaseDesignDocument.viewsStatus).map((viewName) => {
      if (databaseDesignDocument) {
        return databaseDesignDocument.viewsStatus[viewName]
      }
    })
    const designViewStatusChecksum = Object.keys(newDesignDocument.viewsStatus).map((viewName) => newDesignDocument.viewsStatus[viewName])

    if (!_.isEqual(_.sortBy(currentViewStatusChecksum), _.sortBy(designViewStatusChecksum))) {
      await this.database.createDesignDocument(newDesignDocument)
    }
  }

  private buildDesignDocument (): DatabaseDesignDocument {
    const designDocument: DatabaseDesignDocument = {
      name: this.designDocumentName,
      viewsStatus: {
      },
      views: {}
    }

    for (const view of this.buildViews()) {
      designDocument.viewsStatus[view.name] = checksum(`${view.map.toString()}${(view.reduce || '').toString()}`)
      designDocument.views[view.name] = {
        map: view.map.toString()
      }
      if (view.reduce) {
        designDocument.views[view.name].reduce = view.reduce.toString()
      }
    }

    return designDocument
  }

  private validateModel (document: Partial<TUpdateEntity> | TNewEntity): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.modelConstructor.schema.validate(this.model.fromData(document), (error) => {
        if (error) {
          return reject(new DatabaseError(error.code, error.message, JSON.stringify(document), error))
        } else {
          return resolve()
        }
      })
    })
  }
}
