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

import {
  BaseIAMTokenPayload,
  isBaseIAMTokenPayload
} from './BaseIAMTokenPayload'

/**
 * Represents contents of JWT token returned by IAM
 */
export interface LogoutTokenPayload extends BaseIAMTokenPayload {
  /**
   * TODO: Need to find out what this value represents
   */
  jti?: string
  /**
   * TODO: Need to find out what this value represents
   */
  events: object
}

// Basic check about logout IAM token structure validation
export function isIAMLogoutTokenPayload (
  obj: string | { [key: string]: any } | null
): obj is LogoutTokenPayload {
  if (!isBaseIAMTokenPayload(obj)) {
    return false
  }

  return isBaseIAMTokenPayload(obj) && typeof obj.events === 'object'
}
