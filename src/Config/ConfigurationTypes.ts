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

import { ClientApplication } from '../Models/ClientApplicationModels'
import { CreateBucketOptions } from 'couchbase'
import { RSA_JWK } from 'pem-jwk'

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
  Data = 'data',
  Project = 'project',
  AppState = 'state',
  DerivedData = 'derivedData',
}

export type DatabaseConfiguration = {
  readonly initializeContents: boolean
  readonly username: string
  readonly password: string
  readonly bucketAdminPassword: string
  readonly uri: string
  readonly buckets: { [name in BucketKey]: string }
  readonly bucketOptions: CreateBucketOptions
}

export type ScopedAccessTokenConfiguration = {
  readonly name: string
  readonly secret: string
  readonly publicKeyPEM: string | null
  readonly publicKeyJWK: RSA_JWK | null
  readonly expiry: number
  readonly identifier: string // maps to the "kid" property when represented in JWK.
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

export type AWSConfiguration = {
  accessKeyId: string
  secretAccessKey: string
  region: string
}

/**
 * Represents Google authentication configuration.
 */
export type GoogleConfiguration = {
  readonly clientID: string
  readonly clientSecret: string
  readonly authCallback: string
}

/**
 * Represents configuration for IAM
 */
export type IAMConfiguration = {
  // application's client ID configured on IAM server
  readonly clientID: string
  // URL of the IAM server
  readonly authServerURL: string
  // Api server path (endpoint) for IAM callback
  readonly authCallbackPath: string
  // URL of the library web application
  readonly libraryURL: string
  // URL of the Manuscript's api server - ie. current server
  readonly apiServerURL: string[]
  // URL of the IAM allowed servers
  readonly authServerPermittedURLs: string[]
}

/**
 * Represents email sending configuration.
 */
export type EmailConfiguration = {
  readonly fromAddress: string
  readonly fromBaseURL: string
}

export type ClientApplicationsConfiguration = {
  readonly knownClientApplications: Array<ClientApplication>
}

/**
 * Represents [sync_]gateway configuration.
 */
export type GatewayConfiguration = {
  readonly cookieDomain: string
  readonly hostname: string
  readonly ports: {
    admin: string
    public: string
  }
}

export type ServerConfiguration = {
  readonly storeOnlySSLTransmittedCookies: boolean
  readonly allowedCORSOrigins: ReadonlyArray<string>
}

export interface EnvironmentLike {
  [key: string]: string | undefined
}

export interface LiteratumConfiguration {
  readonly allowedIPAddresses: Array<string>
}

export interface PressroomConfiguration {
  readonly baseurl: string
  readonly apiKey: string
}

export interface ShacklesConfiguration {
  readonly baseUrl: string
}

export interface TemplateConfiguration {
  readonly allowedOwners: string[]
  readonly allowedProjects: string[]
}

export interface ConfigurationContainer {
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
  readonly pressroom: PressroomConfiguration
  readonly shackles: ShacklesConfiguration
  readonly literatum: LiteratumConfiguration
  readonly template: TemplateConfiguration

  createBucketOptions(env: NodeJS.ProcessEnv): CreateBucketOptions
}
