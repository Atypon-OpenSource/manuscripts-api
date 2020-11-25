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

import { isCurrent, isIAMOAuthTokenPayload } from '../../../../../src/Utilities/JWT/IAMAuthTokenPayload'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
const cryptoRandomString = require('crypto-random-string')

describe('Login', () => {
  beforeAll(() => {
    (DIContainer as any)._sharedContainer = {
      jwksClient: {
        getSigningKey: (_: string, callback: Function) => {
          callback(null, 'public-key-that-will-not-be-used-because-the-iam-token-verified-below-is-faked-too')
        }
      },
      iamTokenVerifier: { verify: () => true }
    } as any
    return true
  })

  test('ensures that the isIAMOAuthTokenPayload type guard behaves correctly', () => {
    const nullToken = null
    const validToken = {
      email: 'test@test.com',
      family_name: 'doe',
      given_name: 'john',
      email_verified: true,
      sub: 'foo',
      exp: ((new Date()).getTime() / 1000) + 100000, // safely in the future, in seconds.
      iat: ((new Date()).getTime() / 1000) - 100000, // safely in the past, in seconds.
      iss: 'https://iam-test.atypon.com/IAM',
      sid: 'bar',
      nonce: cryptoRandomString(10)
    }
    expect(isCurrent({ exp: validToken.exp, iat: validToken.iat })).toBeTruthy()
    expect(isIAMOAuthTokenPayload(nullToken)).toBeFalsy()
    expect(isIAMOAuthTokenPayload(validToken)).toBeTruthy()
  })
})
