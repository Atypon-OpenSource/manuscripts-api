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

import * as HttpStatus from 'http-status-codes'
import { Cluster, CouchbaseError, N1qlQuery, Bucket } from 'couchbase'
import { parse } from 'url'
import request from 'request-promise-native'
import { Ottoman, CbStoreAdapter } from 'ottoman'
import { log } from '../Utilities/Logger'
import { config } from '../Config/Config'
import { DatabaseConfiguration, BucketKey } from '../Config/ConfigurationTypes'
import {
  NoBucketError,
  DatabaseDesignDocumentError,
  NoDocumentMapperError,
  DatabaseError,
  InvalidBucketError,
  DatabaseDesignDocumentInaccessibleError,
  BucketExistenceCheckError
} from '../Errors'
import { DesignDocumentName, DatabaseDesignDocument } from './DatabaseView'
import { databaseErrorMessage } from './DatabaseErrorMessage'
import { Index, indices as getIndices } from './DatabaseIndices'

/**
 * Load and run database models. Make sure database configurations are correct.
 */
export class Database {

  private _bucket: Bucket | null
  private _documentMapper: Ottoman | null

  private isLoaded: boolean = false

  public constructor (readonly configuration: DatabaseConfiguration,
                      readonly bucketKey: BucketKey) {
    if (!configuration.buckets[bucketKey]) {
      throw new InvalidBucketError(bucketKey)
    }
  }

  public async isViewServiceAlive (): Promise<void> {
    const options = {
      url: this.httpDesignBaseURL,
      method: 'HEAD',
      auth: {
        user: config.DB.username,
        pass: config.DB.password
      },
      resolveWithFullResponse: true,
      simple: false
    }

    const response = await request(options)
    // 404 is the expected response, auth has worked (it would 401 if not).
    if (response.statusCode !== HttpStatus.NOT_FOUND && response.statusCode !== HttpStatus.OK) {
      throw new DatabaseDesignDocumentInaccessibleError(options.url, response.statusCode)
    }
  }

  public get httpBaseURL (): string {
    const urlParts = parse(this.configuration.uri)
    return `http://${urlParts.host}:8091`
  }

  public get httpDesignBaseURL (): string {
    const urlParts = parse(this.configuration.uri)
    return `http://${urlParts.host}:8092/${this.bucketName}/_design`
  }

  public get bucket (): Bucket {
    if (this._bucket === null) {
      throw new NoBucketError()
    }
    return this._bucket
  }

  public get documentMapper (): Ottoman | null {
    return this._documentMapper
  }

  public get bucketName (): string {
    const bucketName = this.configuration.buckets[this.bucketKey]
    if (!bucketName) { throw new NoBucketError() }
    return bucketName
  }

  public indices (): Index[] {
    const bucketName = config.DB.buckets[this.bucketKey]
    const indices = [
      {
        name: 'IX_PRIMARY_DEFAULT',
        script: `CREATE PRIMARY INDEX \`IX_PRIMARY_DEFAULT\` ON \`${
          bucketName
        }\` USING GSI;`
      }
    ]

    indices.push(...getIndices(this.bucketKey))

    return indices
  }

  public async loadDatabaseModels (): Promise<void> {
    if (this.isLoaded) {
      return
    }

    const cluster = new Cluster(config.DB.uri)

    cluster.authenticate(config.DB.username, config.DB.password)

    await this.openBucket(cluster)
    await this.buildIndices(this.indices())

    this.isLoaded = true
  }

  public indexExists (indexName: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const q = `SELECT id FROM system:indexes where name = $1 AND keyspace_id = $2`

      if (!this.bucket) {
        return reject(new NoBucketError())
      }

      const bucketName = config.DB.buckets[this.bucketKey]

      this.bucket.query(
        N1qlQuery.fromString(q).adhoc(false).consistency(N1qlQuery.Consistency.STATEMENT_PLUS),
        [indexName, bucketName],
        (error: CouchbaseError | null, result: any) => {
          if (error) {
            log.error(`An error occurred while checking index ${indexName}`, error)
            return reject(error)
          }

          if (result.length) {
            return resolve(true)
          } else {
            return resolve(false)
          }
        }
      )
    })
  }

  public ensureAlive (): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const n1ql = `SELECT _id FROM ${this.bucketName} USE KEYS ["_id"] LIMIT 0`

      if (!this.bucket) {
        return reject(new NoBucketError())
      }

      this.bucket.query(
        N1qlQuery.fromString(n1ql)
          .adhoc(false)
          .consistency(N1qlQuery.Consistency.STATEMENT_PLUS),
        (error: CouchbaseError | null) => {
          if (error) {
            log.error(
              `An error occurred while connecting to couchbase db ${config.DB.uri}`,
              error
            )
            reject(error)
          }

          resolve()
        }
      )
    })
  }

  public createIndex (indexCreateStatement: string, indexName: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (!this.bucket) {
        throw new NoBucketError()
      }

      this.bucket.query(
        N1qlQuery.fromString(indexCreateStatement)
                 .adhoc(false)
                 .consistency(N1qlQuery.Consistency.STATEMENT_PLUS), [],
        error => {
          if (error) {
            log.error(`An error occurred while creating index ${indexName}`, error)
            return reject(error)
          }
          log.info(`Index ${indexName} created.`)
          return resolve(true)
        }
      )
    })
  }

  public async buildIndices (indexingArray: Index[]): Promise<void> {
    for (const index of indexingArray) {
      const indexExists = await this.indexExists(index.name)
      if (!indexExists) {
        await this.createIndex(index.script, index.name)
      }
    }
  }

  public ensureSecondaryIndicesExist (): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.documentMapper) {
        return reject(new NoDocumentMapperError())
      }

      this.documentMapper.ensureIndices(true, (error: CouchbaseError | null) => {
        if (error) {
          // a non-critical error condition.
          if (error.code === 5000 && error.message.match(/Index build will retry in background./)) {
            log.error(`Non-critical error when attempting to set / update secondary indices: ${error}`)
            return resolve()
          }

          const errorMsg: string = databaseErrorMessage(error.code, error.message)
          return reject(new DatabaseError(error.code, errorMsg, '', error))
        } else {
          return resolve()
        }
      })
    })
  }

  public async getDesignDocument (designDocument: DesignDocumentName): Promise<DatabaseDesignDocument | null> {
    const options = {
      url: this.httpDesignBaseURL,
      auth: {
        user: config.DB.username,
        pass: config.DB.password
      },
      json: true,
      resolveWithFullResponse: true,
      simple: false
    }

    const response = await request(options)

    if (response.statusCode === HttpStatus.NOT_FOUND) {
      return null
    } else if (response.statusCode !== HttpStatus.OK) {
      throw new DatabaseDesignDocumentError(`An error occurred while reading ${designDocument} views of bucket ${config.DB.buckets.user}. Status code = ${response.statusCode}`)
    } else {
      return response.body
    }
  }

  public async createDesignDocument (designDocument: DatabaseDesignDocument): Promise<void> {
    const options = {
      method: 'PUT',
      url: `${this.httpDesignBaseURL}/${designDocument.name}`,
      auth: {
        user: config.DB.username,
        pass: config.DB.password
      },
      body: designDocument,
      json: true,
      resolveWithFullResponse: true,
      simple: false
    }

    const response = await request(options)

    if (response.statusCode !== HttpStatus.CREATED) {
      throw new DatabaseDesignDocumentError(`An error occurred while creating view ddoc ${designDocument.name}. Status code = ${response.statusCode}`)
    } else {
      log.info(`Design document ${designDocument.name} created.`)
      return
    }
  }

  public async bucketExists (): Promise<boolean> {
    const options = {
      url: `${this.httpBaseURL}/pools/default/buckets/${config.DB.buckets[this.bucketKey]}`,
      auth: {
        user: config.DB.username,
        pass: config.DB.password
      },
      json: true,
      resolveWithFullResponse: true,
      simple: false
    }

    try {
      const response = await request(options)
      if (response.statusCode === HttpStatus.NOT_FOUND) {
        return false
      } else if (response.statusCode !== HttpStatus.OK) {
        throw new BucketExistenceCheckError(`Unknown error occurred while checking for bucket existence.`, response.statusCode)
      } else {
        return true
      }
    } catch (error) {
      log.error(`An error occurred while checking for bucket existence ${config.DB.buckets[this.bucketKey]}`, error)
      throw error
    }
  }

  private async openBucket (cluster: Cluster): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._bucket = cluster.openBucket(
        config.DB.buckets[this.bucketKey],
        (error: CouchbaseError | null) => {
          if (error) {
            log.error(`An error occurred while connecting to couchbase db ${config.DB.uri}`, error)
            reject(error)
          }
          if (process.env.NODE_ENV !== 'test') {
            log.debug(`Connection established to ${this.bucketKey} bucket.`)
          }
          resolve()
        }
      )

      const options = { bucket: this._bucket, store: new CbStoreAdapter(this._bucket) }
      this._documentMapper = new Ottoman(options)
    })
  }

}
