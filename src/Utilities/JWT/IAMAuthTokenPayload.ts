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

import { BaseIAMTokenPayload } from './BaseIAMTokenPayload'

/**
 * Represents contents of JWT token returned by IAM
 */
export interface IAMAuthTokenPayload extends BaseIAMTokenPayload {
  /**
   * User's email
   */
  email: string
  /**
   * Family/Last name of the user
   */
  family_name?: string
  /**
   * First name of the user
   */
  given_name?: string
  /**
   * First and last name of the user
   */
  name?: string
  /**
   * epoc timestamp: iat + 5 minutes
   */
  exp: number
  /**
   * String passed from the client in the the authorization request.
   * This is to prevent replay attacks
   */
  nonce: string
  /**
   * Indicates whether email is verified
   */
  email_verified?: boolean
  /**
   * Type of the user. eg. guest, registered
   */
  type: string
}

const requiredStringFields = ['email', 'sub', 'nonce', 'iss']

export function isCurrent(token: { exp?: number; iat?: number }) {
  const now = Date.now()
  if (!token.exp || !token.iat) {
    return false
  }
  const issuedInPast = token.iat * 1000 < now
  const expiryInFuture = token.exp * 1000 > now
  return issuedInPast && expiryInFuture
}

// Basic check about IAM token structure validation
export function isIAMOAuthTokenPayload(
  obj: string | { [key: string]: any } | null
): obj is IAMAuthTokenPayload {
  if (!obj) {
    return false
  }
  if (typeof obj === 'string') {
    return false
  }

  return (
    requiredStringFields.every((key) => typeof obj[key] === 'string') &&
    obj.email_verified &&
    isCurrent(obj)
  )
}
