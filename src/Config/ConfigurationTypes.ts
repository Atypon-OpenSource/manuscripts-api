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

export enum Environment {
  Test = 'test',
  Development = 'development',
  Production = 'production',
}

/**
 * Represents an API configuration.
 */
export type APIConfiguration = {
  readonly port: number
  readonly oauthStateEncryptionKey: string
  readonly hostname: string
}

/**
 * Represents a database configuration.
 */
export enum BucketKey {
  User = 'user',
  Project = 'project',
  ManuscriptDoc = 'manuscriptDoc',
  MigrationBackup = 'migrationBackup',
  ManuscriptSnapshot = 'manuscriptSnapshot',
}

export type DatabaseConfiguration = {
  readonly buckets: { [name in BucketKey]: string }
}

/**
 * Represents authentication configuration.
 */
export type AuthConfiguration = {
  readonly jwtSecret: string
  readonly skipVerification: boolean
  readonly hashSaltRounds: number
  readonly serverSecret: string
  readonly enableNonConnectAuth: boolean
}

/**
 * Represents email sending configuration.
 */
export type EmailConfiguration = {
  readonly fromBaseURL: string
}

export type ServerConfiguration = {
  readonly allowedCORSOrigins: ReadonlyArray<string>
}

export interface EnvironmentLike {
  [key: string]: string | undefined
}

export interface ExternalAPIConfiguration {
  readonly baseurl: string
  readonly apiKey: string
}

export interface DataConfiguration {
  readonly path: string
}
export interface ConfigurationContainer {
  readonly API: APIConfiguration
  readonly DB: DatabaseConfiguration
  readonly auth: AuthConfiguration
  readonly email: EmailConfiguration
  readonly server: ServerConfiguration
  readonly pressroom: ExternalAPIConfiguration
  readonly data: DataConfiguration
}
