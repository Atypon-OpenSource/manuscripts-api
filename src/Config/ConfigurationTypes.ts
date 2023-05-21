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

import { RSA_JWK } from 'pem-jwk'

import { ClientApplication } from '../Models/ClientApplicationModels'

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
  readonly hostname: string
}

/**
 * Represents a database configuration.
 */
export enum BucketKey {
  User = 'user',
  Project = 'project',
}

export type DatabaseConfiguration = {
  readonly buckets: { [name in BucketKey]: string }
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

export type ServerConfiguration = {
  readonly allowedCORSOrigins: ReadonlyArray<string>
}

export interface EnvironmentLike {
  [key: string]: string | undefined
}

export interface PressroomConfiguration {
  readonly baseurl: string
  readonly apiKey: string
}

export interface ConfigurationContainer {
  readonly API: APIConfiguration
  readonly DB: DatabaseConfiguration
  readonly auth: AuthConfiguration
  readonly email: EmailConfiguration
  readonly server: ServerConfiguration
  readonly apps: ClientApplicationsConfiguration
  readonly scopes: ScopedAccessTokenConfiguration[]
  readonly pressroom: PressroomConfiguration
}
