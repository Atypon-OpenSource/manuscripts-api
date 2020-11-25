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

import { Request } from 'express'
import { ValidationError } from '../Errors'

export abstract class BaseController {}

/**
 * Type guard function for Express header-like objects which may or may not be shaped like a bearer token string.
 * @param value a header value.
 */
export function isBearerHeaderValue (value: string | string[] | undefined): boolean {
  return typeof value === 'string' && value.startsWith('Bearer ')
}

export function authorizationBearerToken (req: Request) {
  if (!req.headers) {
    throw new ValidationError('Request unexpectedly missing headers', req.headers)
  }
  const authHeader = req.headers.authorization
  if (!authHeader || Array.isArray(authHeader)) {
    throw new ValidationError('Unexpected user token', authHeader)
  }

  if (!isBearerHeaderValue(authHeader)) {
    throw new ValidationError('Authorization header does not contain a bearer token', authHeader)
  }

  return authHeader.replace('Bearer ', '')
}
