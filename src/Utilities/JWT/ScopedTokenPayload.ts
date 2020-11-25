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

export interface ScopedTokenPayload {

  /**
   * issuer.
   */
  iss: string,

  /**
   * Unique, persistent, user identifier.
   */
  sub: string,

  /**
   * Project ID
   */
  containerID: string,

  /**
   * audience.
   */
  aud: string,

  /**
   * epoc timestamp when the id_token was issued
   */
  iat: number,

  /**
   * Token expiry
   */
  exp: number

}

export function isScopedTokenPayload (obj: string | object | null): obj is ScopedTokenPayload {
  if (!obj) return false
  if (typeof obj === 'string') return false

  return (obj as any).containerID && typeof ((obj as any).containerID) === 'string'
      && (obj as any).sub && typeof ((obj as any).sub) === 'string'
}
