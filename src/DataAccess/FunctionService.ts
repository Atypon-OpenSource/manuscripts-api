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

import { Database } from './Database'
import request from 'request-promise-native'
import { FunctionServiceRESTError, FunctionServiceLogicError } from '../Errors'
import * as HttpStatus from 'http-status-codes'
import { log as logger } from '../Utilities/Logger'
import checksum from 'checksum'
import { isArray, isString } from 'lodash'
import { BucketKey } from '../Config/ConfigurationTypes'
import retry from 'async-retry'
import { URL } from 'url'
import { userCollaboratorFunction } from './EventingFunctions/UserCollaboratorFunction'
import { containerRelatedFunction } from './EventingFunctions/ContainerRelatedFunction'

export enum FunctionLogLevel {
  Info = 'INFO',
  Error = 'ERROR',
  Warning = 'WARNING',
  Debug = 'DEBUG',
  Trace = 'TRACE'
}

export enum DCPStreamBoundary {
  Everything = 'everything',
  FromNow = 'from_now'
}

export interface FunctionSettings {
  processing_status: boolean
  deployment_status: boolean
  checkpoint_interval: number
  cleanup_timers: boolean
  dcp_stream_boundary: DCPStreamBoundary
  description: string
  log_level: FunctionLogLevel
  skip_timer_threshold: number
  sock_batch_size: number
  tick_duration: number
  timer_processing_tick_interval: number
  timer_worker_pool_size: number
  worker_count: number
  using_doc_timer: boolean
  user_prefix: 'eventing' // don't know what else is accepted?
  deadline_timeout: number
  execution_timeout: number
}

const FunctionSettingKeys = [
  'processing_status',
  'deployment_status',
  'checkpoint_interval',
  'cleanup_timers',
  'dcp_stream_boundary',
  'description',
  'log_level',
  'skip_timer_threshold',
  'sock_batch_size',
  'tick_duration',
  'timer_processing_tick_interval',
  'timer_worker_pool_size',
  'worker_count',
  'using_doc_timer',
  'user_prefix',
  'deadline_timeout',
  'execution_timeout'
]

export function isFunctionSettingsLike (
  obj: any
): obj is Partial<FunctionSettings> {
  return (
    obj &&
    Object.keys(obj).length > 0 &&
    Object.keys(obj).every(k => FunctionSettingKeys.includes(k))
  )
}

export interface FunctionMetadata {
  name: string
  shasum: string
}

export interface BucketAlias {
  readonly alias: string
  readonly bucket_name: string
}

export interface FunctionDifferences {
  added: ReadonlyArray<string>
  updated: ReadonlyArray<string>
  removed: ReadonlyArray<string>
}

export function functionMetadata (f: FunctionApplication): FunctionMetadata {
  return {
    name: f.appname,
    shasum: checksum(f.appcode, { algorithm: 'sha1' })
  }
}

function retryOptions (fn: string, operationName: string): retry.Options {
  return {
    retries: 10,
    factor: 1.5,
    minTimeout: 2000,
    maxTimeout: 32000,
    onRetry: (error: Error) => {
      logger.error(
        `Retrying ${operationName} function ${fn} after hitting error`,
        error
      )
    }
  }
}

export interface DocumentMetadata {
  id: string
}

export type UpdateCallback = (doc: any, meta: DocumentMetadata) => void
export type DeleteCallback = (meta: DocumentMetadata) => void
export type EventingLogFunction = (str: string | number | boolean) => void

export interface FunctionDependencyConfig {
  readonly buckets: BucketAlias[]
  readonly metadata_bucket: string
  readonly source_bucket: string
}

export interface FunctionApplicationSource {
  readonly appname: string
  readonly updateCallback?: UpdateCallback
  readonly deleteCallback?: DeleteCallback
  readonly depcfg: FunctionDependencyConfig
  readonly version?: string
  readonly using_doc_timer?: string
  readonly settings: Partial<FunctionSettings>
}

export function ensureValidApplicationSource (
  source: FunctionApplicationSource
) {
  if (source.updateCallback && source.updateCallback.name !== 'OnUpdate') {
    throw new FunctionServiceLogicError(
      `Update callback has unexpected name ('${
        source.updateCallback.name
      }'): ${source.updateCallback.toString()}`
    )
  }
  if (source.deleteCallback && source.deleteCallback.name !== 'OnDelete') {
    throw new FunctionServiceLogicError(
      `Deletion callback has unexpected name ('${
        source.deleteCallback.name
      }'): ${source.deleteCallback.toString()}`
    )
  }
  if (!source.updateCallback && !source.deleteCallback) {
    throw new FunctionServiceLogicError(
      `Both update and delete callbacks missing in application source: ${source}`
    )
  }
}

export function applicationFromSource (
  source: FunctionApplicationSource
): FunctionApplication {
  ensureValidApplicationSource(source)
  const app: FunctionApplication = {
    ...source,
    appcode:
      (source.updateCallback ? source.updateCallback.toString() : '') +
      (source.updateCallback && source.deleteCallback ? '\n\n' : '') +
      (source.deleteCallback ? source.deleteCallback.toString() : '')
  } as any // cast needed as updateCallback, deleteCallback don't belong.

  delete (app as any).updateCallback
  delete (app as any).deleteCallback
  return app
}

export interface FunctionApplication {
  readonly appname: string
  readonly appcode: string
  readonly depcfg: FunctionDependencyConfig
  readonly version?: string
  readonly settings: Partial<FunctionSettings>
}

function isFunctionApplication (obj: any): obj is FunctionApplication {
  return obj && isString(obj.appname) && isString(obj.appcode)
}

function isFunctionApplicationArray (
  obj: any
): obj is Array<FunctionApplication> {
  return (
    obj &&
    isArray(obj) &&
    (obj.length === 0 || obj.every(o => isFunctionApplication(o)))
  )
}

export type EventCallback = UpdateCallback | DeleteCallback
interface FunctionMetadataMap {
  [key: string]: FunctionMetadata | undefined
}

export function compareFunctions (
  functions: ReadonlyArray<FunctionApplication>,
  remote: ReadonlyArray<FunctionApplication>
): FunctionDifferences {
  const localMetadata = functions.map(functionMetadata)
  const localMetadataMap: FunctionMetadataMap = localMetadata.reduce(
    (result, metadata) => {
      (result as any)[metadata.name] = metadata
      return result
    },
    {}
  )

  const remoteMetadata = remote.map(f => functionMetadata(f))
  const remoteMetadataMap: FunctionMetadataMap = remoteMetadata.reduce(
    (result, metadata) => {
      (result as any)[metadata.name] = metadata
      return result
    },
    {}
  )

  const addedFuncNames = localMetadata
    .filter(local => remoteMetadataMap[local.name] === undefined)
    .map(metadata => metadata.name)

  const updatedFuncNames = remote
    .filter(r => {
      const local = localMetadataMap[r.appname]
      return (
        local &&
        local.shasum !==
          (remoteMetadataMap[r.appname] || { shasum: null }).shasum
      )
    })
    .map(local => local.appname)

  const removedFuncNames = remote
    .filter(r => localMetadataMap[r.appname] === undefined)
    .map(r => r.appname)

  return {
    added: addedFuncNames,
    updated: updatedFuncNames,
    removed: removedFuncNames
  }
}

export class FunctionService {
  constructor (
    readonly userBucket: Database,
    readonly dataBucket: Database,
    readonly appStateBucket: Database,
    readonly derivedDataBucket: Database,
    readonly discussionsBucket: Database
  ) {}

  httpBaseURL (bucket: Database) {
    const baseURL = new URL(bucket.httpBaseURL)
    baseURL.port = '8096'
    baseURL.pathname = 'api/v1/functions'
    return baseURL.toString()
  }

  private requestOptions (
    bucket: Database,
    options: { method: string; body?: object; path?: string }
  ) {
    const opts = {
      method: options.method,
      url: this.httpBaseURL(bucket) + (options.path ? `/${options.path}` : ''),
      auth: {
        user: bucket.configuration.username,
        pass: bucket.configuration.password
      },
      body: options.body,
      json: true,
      resolveWithFullResponse: true,
      simple: false
    }
    return opts
  }

  public bucketForKey (key: BucketKey): Database | null {
    switch (key) {
      case BucketKey.User:
        return this.userBucket

      case BucketKey.Data:
        return this.dataBucket

      case BucketKey.AppState:
        return this.appStateBucket

      case BucketKey.DerivedData:
        return this.derivedDataBucket

      case BucketKey.Discussions:
        return this.discussionsBucket

      default:
        return null
    }
  }

  public functionDefinitions (
    bucketKey: BucketKey
  ): FunctionApplicationSource[] {
    switch (bucketKey) {
      case BucketKey.Data:
        return [
          userCollaboratorFunction(
            this.bucketForKey(BucketKey.Data)!,
            this.bucketForKey(BucketKey.AppState)!
          ),
          containerRelatedFunction(
            this.bucketForKey(BucketKey.Data)!,
            this.bucketForKey(BucketKey.AppState)!
          )
        ]
      default:
        return []
    }
  }

  public async synchronize (bucketKey: BucketKey): Promise<void> {
    const bucket = this.bucketForKey(bucketKey)
    if (!bucket) {
      throw new FunctionServiceLogicError(
        `Function service not aware of bucket with key ${bucketKey}`
      )
    }

    const functions = this.functionDefinitions(bucketKey).map(
      applicationFromSource
    )

    if (functions.length === 0) {
      logger.debug(`No functions in bucket with key '${bucketKey}'`)
      return Promise.resolve()
    }

    const remoteFunctions = await this.getFunctions(bucket)
    const diff = compareFunctions(functions, remoteFunctions)

    const removedOrUpdatedFuncNames = diff.removed.concat(diff.updated)
    const postedFuncNames = diff.added.concat(diff.updated)
    const postedFuncs = functions.filter(f =>
      postedFuncNames.includes(f.appname)
    )

    // mark the to-be-deployed functions settings with deployment_status = true, processing_status = true
    postedFuncs.forEach(f => {
      f.settings.deployment_status = true
      f.settings.processing_status = true
    })

    // 1. Un-deploy eventing functions that need removing or updating (set their settings to deployment_status = false), retrying a total of 5 times with exponential backoff.
    // 2. Delete functions that need removing or updating (not allowed before un-deploying, hence step #1 above).
    // 3. Post new and updated functions.
    // 4. Collate settings for all the functions and post them in parallel.
    await Promise.all(
      removedOrUpdatedFuncNames.map(fn => this.undeployFunction(bucket, fn))
    )
    await retry(
      () => this.deleteFunctions(bucket, removedOrUpdatedFuncNames),
      retryOptions(removedOrUpdatedFuncNames.join(','), 'deleting')
    )
    await retry(
      () => this.postFunctions(bucket, postedFuncs),
      retryOptions(postedFuncs.map(f => f.appname).join(','), 'posting')
    )
  }

  public async getFunctions (
    bucket: Database
  ): Promise<Array<FunctionApplication>> {
    const options = this.requestOptions(bucket, { method: 'GET' })
    const response = await request(options)
    if (response.statusCode !== HttpStatus.OK) {
      throw new FunctionServiceRESTError(
        `An error while getting functions from ${options.url}. Status code = ${
          response.statusCode
        }`,
        response.statusCode,
        response.body
      )
    }

    if (!isFunctionApplicationArray(response.body)) {
      throw new FunctionServiceRESTError(
        `Failed to parse function application array from response body: ${
          response.body
        }`,
        response.statusCode,
        response.body
      )
    }
    return response.body
  }

  public async undeployFunction (
    bucket: Database,
    functionName: string
  ): Promise<void> {
    const undeployedSettings = {
      deployment_status: false,
      processing_status: false
    }
    return retry(
      () => this.postSettings(bucket, functionName, undeployedSettings),
      retryOptions(functionName, 'un-deploying')
    )
  }

  public async deployFunction (
    bucket: Database,
    functionName: string
  ) {
    const deploySettings = {
      deployment_status: true,
      processing_status: true
    }
    return retry(
      () => this.postSettings(bucket, functionName, deploySettings),
      retryOptions(functionName, 'deploying')
    )
  }

  public async postFunctions (
    bucket: Database,
    functions: ReadonlyArray<FunctionApplication>
  ): Promise<void> {
    if (functions.length === 0) {
      return Promise.resolve()
    }

    const options = this.requestOptions(bucket, {
      method: 'POST',
      body: functions
    })
    const response = await request(options)
    // logger.info(response.body)
    if (
      response.statusCode !== HttpStatus.CREATED &&
      response.statusCode !== HttpStatus.OK
    ) {
      throw new FunctionServiceRESTError(
        `An error occurred while posting functions (${functions
          .map(f => f.appname)
          .join(',')}). Status code = ${response.statusCode}: ${JSON.stringify(
          response.body
        )}`,
        response.statusCode,
        response.body
      )
    } else {
      logger.info(
        `Functions ${functions.map(f => f.appname).join(',')} created.`
      )
      return
    }
  }

  public async deleteFunctions (
    bucket: Database,
    functionNames: ReadonlyArray<string>
  ): Promise<boolean> {
    if (functionNames.length === 0) {
      return false
    }
    const options = this.requestOptions(bucket, {
      method: 'DELETE',
      body: functionNames
    })
    const response = await request(options)
    // logger.info(response.body)
    if (response.statusCode !== HttpStatus.OK) {
      throw new FunctionServiceRESTError(
        `An error occurred while deleting functions (${functionNames}). Status code = ${
          response.statusCode
        }: ${JSON.stringify(response.body)}`,
        response.statusCode,
        response.body
      )
    } else {
      logger.info(`Functions ${functionNames} deleted.`)
      return true
    }
  }

  public async getSettings (
    bucket: Database,
    functionName: string
  ): Promise<Partial<FunctionSettings>> {
    const options = this.requestOptions(bucket, {
      method: 'GET',
      path: `${functionName}/settings`
    })
    const response = await request(options)
    // logger.info(response.body)
    if (response.statusCode !== HttpStatus.OK) {
      throw new FunctionServiceRESTError(
        `An error occurred while getting settings for function '${functionName}'. Status code = ${
          response.statusCode
        }: ${JSON.stringify(response.body)}`,
        response.statusCode,
        response.body
      )
    }
    if (!isFunctionSettingsLike(response.body)) {
      throw new FunctionServiceRESTError(
        `Response body do not look like a function settings: ${JSON.stringify(
          response.body
        )}`,
        response.statusCode,
        response.body
      )
    }

    return response.body
  }

  public async postSettings (
    bucket: Database,
    functionName: string,
    settings: Partial<FunctionSettings>
  ): Promise<void> {
    const options = this.requestOptions(bucket, {
      method: 'POST',
      path: `${functionName}/settings`,
      body: settings
    })
    const response = await request(options)
    // logger.info(response.body)
    if (
      response.statusCode !== HttpStatus.CREATED &&
      response.statusCode !== HttpStatus.OK
    ) {
      throw new FunctionServiceRESTError(
        `An error occurred while posting settings for function '${functionName}'. Status code = ${
          response.statusCode
        }: ${JSON.stringify(response.body)}`,
        response.statusCode,
        response.body
      )
    } else {
      logger.info(`Function '${functionName}' settings posted.`)
      return
    }
  }
}
