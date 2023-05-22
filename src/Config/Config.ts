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

import { config as load } from 'dotenv-safe'
import { existsSync } from 'fs'
import * as path from 'path'

import { ConfigurationError } from '../Errors'
import {
  clientApplicationsFromSplitString,
  scopeConfigurationsFromSplitString,
} from '../Models/ClientApplicationModels'
import { isNumber, isString } from '../util'
import { log } from '../Utilities/Logger'
import {
  APIConfiguration,
  AuthConfiguration,
  ClientApplicationsConfiguration,
  ConfigurationContainer,
  DatabaseConfiguration,
  EmailConfiguration,
  Environment,
  EnvironmentLike,
  PressroomConfiguration,
  ScopedAccessTokenConfiguration,
  ServerConfiguration,
} from './ConfigurationTypes'
import { normalizeURL } from './normalize-url'

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
  readonly email: EmailConfiguration
  readonly server: ServerConfiguration
  readonly apps: ClientApplicationsConfiguration
  readonly scopes: ScopedAccessTokenConfiguration[]
  readonly pressroom: PressroomConfiguration

  constructor(env: EnvironmentLike) {
    this.API = {
      port: Number(env.APP_PORT),
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
      enableNonConnectAuth: Boolean(
        getNumber(env.APP_ENABLE_NON_CONNECT_AUTH, 'APP_ENABLE_NON_CONNECT_AUTH')
      ),
    }

    const buckets = {
      user: getString(env.APP_USER_BUCKET, 'APP_USER_BUCKET'),
      project: getString(env.APP_DATA_BUCKET, 'APP_DATA_BUCKET'),
    }

    this.DB = {
      buckets,
    }

    this.email = {
      fromAddress: getString(env.APP_FROM_EMAIL, 'APP_FROM_EMAIL'),
      fromBaseURL: normalizeURL(getString(env.APP_BASE_URL, 'APP_BASE_URL')),
    }

    const host = this.email.fromBaseURL.replace(/https{0,1}\/\//, '')
    const additionalOrigins = [`http://${host}`, `https://${host}`]
    this.server = {
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
  }

  static fromEnv(envExamplePath: string) {
    if (existsSync('.env')) {
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
}

const env = Configuration.fromEnv(path.join(__dirname, `../../.env`))
export const config = new Configuration(env)
