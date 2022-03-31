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

import * as jsonwebtoken from 'jsonwebtoken'
import fetch from 'node-fetch'

import { config } from '../Config/Config'
import { IAMIssuerError, InvalidCredentialsError } from '../Errors'
import { isIAMOAuthTokenPayload } from '../Utilities/JWT/IAMAuthTokenPayload'
import { isIAMLogoutTokenPayload } from '../Utilities/JWT/IAMLogoutTokenPayload'
import { AuthService } from '../DomainServices/Auth/AuthService'

export interface IIAMTokenVerifier {
  loginVerify(token: string, secretOrPair: string, nonce: string, audience?: string): void
  logoutVerify(token: string, secretOrPair: string, audience?: string): void
}

export class IAMTokenVerifier implements IIAMTokenVerifier {
  constructor() {
    this.setIssuer().catch((e) => {
      throw new IAMIssuerError(e)
    })
  }

  private issuer: string

  private verify(token: string, secret: string, audience?: string, hashedNonce?: string) {
    return jsonwebtoken.verify(token, secret, {
      algorithms: ['RS512'],
      audience,
      issuer: this.issuer,
      nonce: hashedNonce,
    })
  }

  public loginVerify(token: string, secret: string, nonce: string, audience?: string) {
    const hashedNonce = AuthService.hashNonce(nonce)
    const verifiedToken = this.verify(token, secret, audience, hashedNonce)

    if (!isIAMOAuthTokenPayload(verifiedToken)) {
      throw new InvalidCredentialsError('Invalid IAM token payload')
    }
  }

  public logoutVerify(token: string, secret: string, audience?: string) {
    const verifiedToken = this.verify(token, secret, audience)

    if (!isIAMLogoutTokenPayload(verifiedToken)) {
      throw new InvalidCredentialsError('Invalid IAM logout token payload')
    }
  }

  public isValidIssuer(issuer: string) {
    return this.issuer === issuer
  }

  public async setIssuer() {
    if (process.env.NODE_ENV !== 'test') {
      const body = await fetch(`${config.IAM.authServerURL}/.well-known/openid-configuration`)
      const json = await body.json()
      this.issuer = json.issuer
    } else {
      this.issuer = config.IAM.apiServerURL[0]
    }
  }
}
