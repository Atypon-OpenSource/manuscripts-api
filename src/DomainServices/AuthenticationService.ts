/*!
 * © 2024 Atypon Systems LLC
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

import { AccountNotFoundError } from '../Errors'
import { UserClient } from '../Models/RepositoryModels'
import { UserCredentials } from '../Models/UserModels'
import { generateUserToken } from '../Utilities/JWT/LoginTokenPayload'

export class AuthenticationService {
  constructor(private readonly userRepoistory: UserClient) {}
  public async serverToServerTokenAuth({ deviceID, connectUserID }: UserCredentials) {
    const user = await this.userRepoistory.findByConnectID(connectUserID)
    if (!user) {
      throw new AccountNotFoundError(connectUserID)
    }
    const { id, email } = user
    const token = generateUserToken({
      email,
      id,
      deviceID,
    })
    return token
  }
}
