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

import jwt from 'jsonwebtoken'

import { config } from '../Config/Config'
import { UserClient } from '../DataAccess/Repository'
import { AccountNotFoundError } from '../Errors'
import { TokenPayload, UserCredentials } from '../Models/UserModels'
import { ProjectService } from './ProjectService'

export class AuthenticationService {
  constructor(private readonly userRepoistory: UserClient) {}
  public async serverToServerAuthToken({ deviceID, appID, connectUserID }: UserCredentials) {
    console.log('hereqweq')
    const user = await this.userRepoistory.findByConnectID(connectUserID)
    if (!user) {
      throw new AccountNotFoundError(connectUserID)
    }
    const { id, email } = user
    const token = this.generateUserToken({
      email,
      id,
      deviceID,
      appID,
    })
    return token
  }
  public createAuthorizationToken(scope: string, user: Express.User) {
    const scopeInfo = ProjectService.findScope(scope, config.scopes)
    const payload = {
      iss: config.API.hostname,
      sub: user.id,
      aud: scopeInfo.name,
      email: user.email,
    }
    return jwt.sign(payload, scopeInfo.secret, {
      algorithm: scopeInfo.publicKeyPEM === null ? 'HS256' : 'RS256',
      keyid: scopeInfo.identifier,
      expiresIn: `${scopeInfo.expiry}m`,
    })
  }
  private generateUserToken(payload: TokenPayload) {
    const fullPayload = {
      ...payload,
      aud: config.email.fromBaseURL,
      iss: config.API.hostname,
    }
    return jwt.sign(fullPayload, config.auth.jwtSecret)
  }
}
