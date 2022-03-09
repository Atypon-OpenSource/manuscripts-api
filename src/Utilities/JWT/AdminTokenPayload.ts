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

import { isNonEmptyString } from '../../util'

/**
 * Represents the contents of a JWT token payload;
 * A token payload is stored inside a UserToken object at its 'token' key.
 */
export interface AdminTokenPayload {
  /**
   * Connect user id.
   */
  connectUserID?: string
  /**
   * User's email.
   */
  email?: string
}

export function isAdminTokenPayload(
  obj: AdminTokenPayload | string | null
): obj is AdminTokenPayload {
  if (!obj) {
    return false
  }
  if (typeof obj === 'string') {
    return false
  }

  // NOTE: Either email or connectUserID must be set.
  return isNonEmptyString(obj.connectUserID) || isNonEmptyString(obj.email)
}
