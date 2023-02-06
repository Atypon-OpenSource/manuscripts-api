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

import { AuthorizedUser, Credentials, ServerToServerAuthCredentials } from '../../Models/UserModels'

export interface ResetPasswordOptions {
  /**
   * Token's unique id.
   */
  tokenId: string
  /**
   * User's new password.
   */
  password: string
}

export interface IAuthService {
  /**
   * Validates user credentials and creates auth token if credentials is valid.
   * @param credentials User's login credentials.
   */
  login(credentials: Credentials): Promise<AuthorizedUser>
  /**
   * Create token on behalf of user.
   */
  serverToServerTokenAuth(credentials: ServerToServerAuthCredentials): Promise<AuthorizedUser>
}
