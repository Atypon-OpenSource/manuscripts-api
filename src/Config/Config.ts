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

import * as path from 'path'
import { load } from 'dotenv-safe'
import { isString, isNumber } from '../util'
import { CreateBucketOptions } from 'couchbase'
import {
  clientApplicationsFromSplitString,
  scopeConfigurationsFromSplitString,
} from '../Models/ClientApplicationModels'
import { existsSync, readFileSync } from 'fs'
import { log } from '../Utilities/Logger'
import { ConfigurationError } from '../Errors'
import {
  APIConfiguration,
  DatabaseConfiguration,
  AuthConfiguration,
  AWSConfiguration,
  GoogleConfiguration,
  EmailConfiguration,
  GatewayConfiguration,
  ServerConfiguration,
  ClientApplicationsConfiguration,
  EnvironmentLike,
  Environment,
  ConfigurationContainer,
  IAMConfiguration,
  ScopedAccessTokenConfiguration,
  LiteratumConfiguration,
  PressroomConfiguration,
  TemplateConfiguration,
  ShacklesConfiguration,
} from './ConfigurationTypes'
import { normalizeURL } from './normalize-url'

const isUTF8 = require('is-utf8')

/**
 * Configuration string validator:
 * passes input parameter through as return value
 * if it is a non-empty string, throws otherwise.
 */
function getString(value: any, key: string): string {
  if (!isString(value) || value.length === 0) {
    throw new ConfigurationError(key, value)
  }
  return value
}

function getArray(value: string, key: string, separator: string): string[] {
  if (value === '') {
    return []
  }
  const arrayParts = value.split(separator)
  for (const part of arrayParts) {
    if (!isString(part) || part.length === 0) {
      throw new ConfigurationError(key, value)
    }
  }
  return arrayParts
}

function getOptionalArray(envVar: string | undefined, key: string, separator: string): string[] {
  if (envVar === undefined || envVar === '') {
    return []
  }
  const value = getString(envVar, key)
  const arrayParts = value.split(separator)
  for (const part of arrayParts) {
    if (!isString(part) || part.length === 0) {
      throw new ConfigurationError(key, value)
    }
  }
  return arrayParts
}

// undefined intentionally here,
// in order to avoid creating an object with null values
// (which the relevant 3rd party code may not interpret similarly).
function getStringOptional(value: any): string | undefined {
  if (!isString(value) || value.length === 0) {
    return undefined
  }
  return value
}

/**
 * Configuration number validator:
 * passes input parameter through as return value
 * if it is a number, return null otherwise.
 *
 * The use of undefined (instead of null) is intentional, in order to avoid
 * passing objects with null values to 3rd party code (which may not interpret them correctly).
 */
function getNumberOptional(value: any): number | undefined {
  const numberVal = Number(value)
  if (!isNumber(numberVal) || isNaN(numberVal) || !isFinite(numberVal)) {
    return undefined
  }
  return numberVal
}

function getNumber(value: any, key: string, allowMissing?: boolean): number {
  const numberVal = Number(value)
  if (!allowMissing && (!isNumber(numberVal) || isNaN(numberVal) || !isFinite(numberVal))) {
    throw new ConfigurationError(key, value)
  }
  return numberVal
}

export class Configuration implements ConfigurationContainer {
  readonly API: APIConfiguration
  readonly DB: DatabaseConfiguration
  readonly auth: AuthConfiguration
  readonly AWS: AWSConfiguration
  readonly google: GoogleConfiguration
  readonly IAM: IAMConfiguration
  readonly email: EmailConfiguration
  readonly gateway: GatewayConfiguration
  readonly server: ServerConfiguration
  readonly apps: ClientApplicationsConfiguration
  readonly scopes: ScopedAccessTokenConfiguration[]
  readonly literatum: LiteratumConfiguration
  readonly pressroom: PressroomConfiguration
  readonly shackles: ShacklesConfiguration
  readonly template: TemplateConfiguration

  constructor(env: EnvironmentLike) {
    const bucketOptions = this.createBucketOptions(env)

    this.API = {
      port: Number(env.APP_PORT),
      oauthStateEncryptionKey: getString(
        env.APP_OAUTH_STATE_ENCRYPTION_KEY,
        'APP_OAUTH_STATE_ENCRYPTION_KEY'
      ),
      hostname: getString(env.APP_HOSTNAME_PUBLIC, 'APP_HOSTNAME_PUBLIC'),
    }

    /* istanbul ignore next */
    const skipVerification =
      env.NODE_ENV === 'development' &&
      Boolean(getNumber(env.APP_SKIP_ACCOUNT_VERIFICATION, 'APP_SKIP_ACCOUNT_VERIFICATION'))

    this.auth = {
      jwtSecret: getString(env.APP_JWT_SECRET, 'APP_JWT_SECRET'),
      skipVerification: skipVerification,
      hashSaltRounds:
        getNumber(env.APP_HASH_SALT_ROUNDS, 'APP_HASH_SALT_ROUNDS', true) ||
        (env.NODE_ENV === Environment.Production ? 10 : 3),
      serverSecret: getString(env.APP_SERVER_SECRET, 'APP_SERVER_SECRET'),
      enableNonConnectAuth: Boolean(
        getNumber(env.APP_ENABLE_NON_CONNECT_AUTH, 'APP_ENABLE_NON_CONNECT_AUTH')
      ),
    }

    const buckets = {
      user: getString(env.APP_USER_BUCKET, 'APP_USER_BUCKET'),
      data: getString(env.APP_DATA_BUCKET, 'APP_DATA_BUCKET'),
      project: getString(env.APP_DATA_BUCKET, 'APP_DATA_BUCKET'),
      state: getString(env.APP_STATE_BUCKET, 'APP_STATE_BUCKET'),
      derivedData: getString(env.APP_DERIVED_DATA_BUCKET, 'APP_DERIVED_DATA_BUCKET'),
    }

    // database initialization should not be happening without INITIALIZE_DATABASE='true',
    // except for when running tests when it should occur also when INITIALIZE_DATABASE was omitted.
    /* istanbul ignore next */
    const initialize =
      env.INITIALIZE_DATABASE === 'true' ||
      (typeof env.INITIALIZE_DATABASE === 'undefined' && env.NODE_ENV === Environment.Test)

    this.DB = {
      bucketOptions,
      buckets,
      initializeContents: initialize,
      uri: normalizeURL(getString(env.APP_DB_URI, 'APP_DB_URI')),
      username: getString(env.APP_COUCHBASE_ADMIN_USER, 'APP_COUCHBASE_ADMIN_USER'),
      password: getString(env.APP_COUCHBASE_ADMIN_PASS, 'APP_COUCHBASE_ADMIN_PASS'),
      bucketAdminPassword: getString(
        env.APP_COUCHBASE_RBAC_PASSWORD,
        'APP_COUCHBASE_RBAC_PASSWORD'
      ),
    }

    this.AWS = {
      accessKeyId: getString(env.APP_AWS_ACCESS_KEY_ID, 'APP_AWS_ACCESS_KEY_ID'),
      secretAccessKey: getString(env.APP_AWS_SECRET_ACCESS_KEY, 'APP_AWS_SECRET_ACCESS_KEY'),
      region: getString(env.APP_AWS_REGION, 'APP_AWS_REGION'),
    }

    this.google = {
      clientID: getString(env.APP_GOOGLE_CLIENT_ID, 'APP_GOOGLE_CLIENT_ID'),
      clientSecret: getString(env.APP_GOOGLE_CLIENT_SECRET, 'APP_GOOGLE_CLIENT_SECRET'),
      authCallback: normalizeURL(
        getString(env.APP_GOOGLE_AUTH_CALLBACK, 'APP_GOOGLE_AUTH_CALLBACK')
      ),
    }

    this.IAM = {
      clientID: getString(env.APP_IAM_CLIENT_ID, 'APP_IAM_CLIENT_ID'),
      authServerURL: getString(env.APP_IAM_SERVER_URL, 'APP_IAM_SERVER_URL'),
      authServerPermittedURLs: Array.from(
        new Set(
          getArray(
            getString(env.APP_IAM_PERMITTED_SERVER_URLS, 'APP_IAM_PERMITTED_SERVER_URLS'),
            'APP_IAM_PERMITTED_SERVER_URLS',
            ';'
          )
        )
      ),
      authCallbackPath: normalizeURL(
        getString(env.APP_IAM_AUTH_CALLBACK_PATH, 'APP_IAM_AUTH_CALLBACK_PATH')
      ),
      libraryURL: normalizeURL(getString(env.APP_IAM_LIBRARY_URL, 'APP_IAM_LIBRARY_URL')),
      apiServerURL: Array.from(
        new Set(
          getArray(
            getString(env.APP_API_SERVER_URL, 'APP_API_SERVER_URL'),
            'APP_API_SERVER_URL',
            ';'
          )
        )
      ),
    }

    this.email = {
      fromAddress: getString(env.APP_FROM_EMAIL, 'APP_FROM_EMAIL'),
      fromBaseURL: normalizeURL(getString(env.APP_BASE_URL, 'APP_BASE_URL')),
    }

    this.gateway = {
      cookieDomain: getString(env.APP_GATEWAY_COOKIE_DOMAIN, 'APP_GATEWAY_COOKIE_DOMAIN'),
      hostname: getString(env.APP_GATEWAY_HOSTNAME, 'APP_GATEWAY_HOSTNAME'),
      ports: {
        admin: getString(env.APP_GATEWAY_ADMIN_PORT, 'APP_GATEWAY_ADMIN_PORT'),
        public: getString(env.APP_GATEWAY_PUBLIC_PORT, 'APP_GATEWAY_PUBLIC_PORT'),
      },
    }

    const host = this.email.fromBaseURL.replace(/https{0,1}\:\/\//, '')
    const additionalOrigins = [`http://${host}`, `https://${host}`]
    this.server = {
      storeOnlySSLTransmittedCookies: Boolean(
        getNumber(
          env.APP_STORE_ONLY_SSL_TRANSMITTED_COOKIES,
          'APP_STORE_ONLY_SSL_TRANSMITTED_COOKIES'
        )
      ),
      allowedCORSOrigins: Array.from(
        new Set(
          getArray(
            getString(env.APP_ALLOWED_CORS_ORIGINS, 'APP_ALLOWED_CORS_ORIGINS'),
            'APP_ALLOWED_CORS_ORIGINS',
            ';'
          ).concat(additionalOrigins)
        )
      ), // get unique values from potentially duplicated ones.
    }

    this.literatum = {
      allowedIPAddresses: Array.from(
        new Set(
          getArray(
            getString(env.APP_ALLOWED_IP_ADDRESSES, 'APP_ALLOWED_IP_ADDRESSES'),
            'APP_ALLOWED_IP_ADDRESSES',
            ';'
          )
        )
      ),
    }

    this.apps = {
      knownClientApplications: clientApplicationsFromSplitString(
        getString(env.APP_CLIENT_APPLICATIONS, 'APP_CLIENT_APPLICATIONS'),
        ';',
        ','
      ),
    }

    this.scopes = scopeConfigurationsFromSplitString(
      getString(env.APP_CONTAINER_TOKEN_SCOPES, 'APP_CONTAINER_TOKEN_SCOPES'),
      ';',
      ','
    )

    this.pressroom = {
      baseurl: getString(env.APP_PRESSROOM_BASE_URL, 'APP_PRESSROOM_BASE_URL'),
      apiKey: getString(env.APP_PRESSROOM_APIKEY, 'APP_PRESSROOM_APIKEY'),
    }

    this.shackles = {
      baseUrl: getString(env.SHACKLES_URL, 'SHACKLES_URL'),
    }

    this.template = {
      allowedOwners: getOptionalArray(
        env.APP_COUCHBASE_ALLOWED_OWNERS,
        'APP_COUCHBASE_ALLOWED_OWNERS',
        ';'
      ),
      allowedProjects: getOptionalArray(
        env.APP_COUCHBASE_ALLOWED_PROJECTS,
        'APP_COUCHBASE_ALLOWED_PROJECTS',
        ';'
      ),
    }
  }

  static fromEnv(envExamplePath: string) {
    if (existsSync('.env') && isUTF8(readFileSync('.env'))) {
      const dotenvResult = load({
        allowEmptyValues: false,
        sample: envExamplePath,
      })

      // hack to ignore the case of missing .env
      if (dotenvResult && dotenvResult.error) {
        throw dotenvResult.error
      }
    } else {
      log.error('.env is missing or is not a UTF8 encoded text file.')
    }

    return process.env // load() call above loads .env file into process.env
  }

  public createBucketOptions(env: NodeJS.ProcessEnv): CreateBucketOptions {
    const authType = getStringOptional(env.APP_DB_AUTH_TYPE)
    const bucketType = getStringOptional(env.APP_DB_BUCKET_TYPE)
    const ramQuotaMB = getNumberOptional(env.APP_DB_RAM_QUOTA_MB)
    const replicaNumber = getNumberOptional(env.APP_DB_REPLICA_NUMBER)

    const bucketOptions: CreateBucketOptions = {}
    if (authType) {
      bucketOptions.authType = authType
    }
    if (bucketType) {
      bucketOptions.bucketType = bucketType
    }
    if (ramQuotaMB) {
      bucketOptions.ramQuotaMB = ramQuotaMB
    }
    if (replicaNumber) {
      bucketOptions.replicaNumber = replicaNumber
    }

    return bucketOptions
  }
}

const env = Configuration.fromEnv(path.join(__dirname, `../../.env`))
export const config = new Configuration(env)
