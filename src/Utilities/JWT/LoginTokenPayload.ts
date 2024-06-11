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
export type LoginTokenPayload = {
  email: string
  deviceID: string
  id: string
  aud: string
  iat: number
  iss: string
}

export type LoginTokenPayloadLike = Pick<
  LoginTokenPayload,
  Exclude<keyof LoginTokenPayload, 'aud' | 'iss' | 'iat'>
>

export function generateUserToken(payload: LoginTokenPayloadLike) {
  const fullPayload = {
    ...payload,
    aud: config.email.fromBaseURL,
    iss: config.API.hostname,
  }
  return jwt.sign(fullPayload, config.auth.jwtSecret)
}

export function timestamp() {
  return new Date().getTime() / 1000
}

export function isLoginTokenPayload(obj: string | object | null): obj is LoginTokenPayload {
  console.log(obj)
  if (!obj) {
    return false
  }
  if (typeof obj === 'string') {
    return false
  }
  return (
    (obj as any).id &&
    typeof (obj as any).id === 'string' &&
    (obj as any).deviceID &&
    typeof (obj as any).deviceID === 'string'
  )
}
