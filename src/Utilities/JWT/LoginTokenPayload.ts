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

import jwt from 'jsonwebtoken'

import { config } from '../../Config/Config'

/**
 * Represents the contents of a JWT token payload;
 * A token payload is stored inside a UserToken object at its 'token' key.
 */
export interface LoginTokenPayload {
  /**
   * User's unique id.
   */
  userId: string
  /**
   * User's connect id.
   */
  connectUserID?: string
  /**
   * User's profile IDs.
   */
  userProfileId: string
  /**
   * Token expiry
   */
  expiry?: number
  /**
   * User's email.
   */
  email?: string
  /**
   * audience.
   */
  aud: string
  /**
   * issuer.
   */
  iss: string
}

type LoginTokenPayloadLike = Pick<
  LoginTokenPayload,
  Exclude<keyof LoginTokenPayload, 'aud' | 'iss'>
>

export const generateLoginToken = (
  payload: LoginTokenPayloadLike,
  expiryTime: number | null
): string => {
  const fullPayload: LoginTokenPayload = {
    ...payload,
    aud: config.email.fromBaseURL,
    iss: config.API.hostname,
  }

  if (expiryTime) {
    fullPayload.expiry = expiryTime
  }

  return jwt.sign(fullPayload, config.auth.jwtSecret)
}

export function isLoginTokenPayload(obj: string | object | null): obj is LoginTokenPayload {
  if (!obj) {
    return false
  }
  if (typeof obj === 'string') {
    return false
  }

  return (obj as any).userId && typeof (obj as any).userId === 'string'
}

export function timestamp() {
  return new Date().getTime() / 1000
}

export const getExpirationTime = (hours: number): number => {
  return Math.floor(timestamp()) + hours * 60 * 60
}
