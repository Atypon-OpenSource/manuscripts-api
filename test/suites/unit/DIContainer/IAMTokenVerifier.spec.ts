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

import '../../../utilities/dbMock'

import { DIContainer } from '../../../../src/DIContainer/DIContainer'
import { config } from '../../../../src/Config/Config'
import { InvalidCredentialsError } from '../../../../src/Errors'

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({sub: '2327a7a5-3bca-4877-a1dc-a50650e5c1f1',
    email_verified: true,
    iss: 'https://iam-test.atypon.com/api-server',
    phone_number_verified: false,
    given_name: 'Paul',
    type: 'registered',
    nonce: '362ff09a4f',
    aud: 'library',
    name: 'Paul Connolly',
    phone_number: '',
    exp: 1544130189,
    iat: 1541538189,
    family_name: 'Connolly',
    email: 'pconnolly@atypon.com'
  }))
}))

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('IAMTokenVerifier', () => {
  test('isValidIssuer', async () => {
    const iamTokenVerifier = DIContainer.sharedContainer.iamTokenVerifier

    expect(iamTokenVerifier.isValidIssuer('foobar')).toBeFalsy()
    expect(
      iamTokenVerifier.isValidIssuer(config.IAM.apiServerURL)
    ).toBeTruthy()
  })

  test('verify - should fail if token is not IAM token', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMzI3YTdhNS0zYmNhLTQ4NzctYTFkYy1hNTA2NTBlNWMxZjEiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaWFtLXRlc3QuYXR5cG9uLmNvbSIsInBob25lX251bWJlcl92ZXJpZmllZCI6ZmFsc2UsImdpdmVuX25hbWUiOiJQYXVsIiwidHlwZSI6InJlZ2lzdGVyZWQiLCJub25jZSI6IjM2MmZmMDlhNGYiLCJhdWQiOiJsaWJyYXJ5IiwibmFtZSI6IlBhdWwgQ29ubm9sbHkiLCJwaG9uZV9udW1iZXIiOiIiLCJleHAiOjE1NDQxMzAxODksImlhdCI6MTU0MTUzODE4OSwiZmFtaWx5X25hbWUiOiJDb25ub2xseSIsImVtYWlsIjoicGNvbm5vbGx5QGF0eXBvbi5jb20ifQ.jI1urSNPESEXqnATopmVQhJt-hGjHLW4j-Su-YLzhR4'
    const secret = 'secret'
    const nonce = 'something'

    const iamTokenVerifier = DIContainer.sharedContainer.iamTokenVerifier

    return expect(() =>
      iamTokenVerifier.loginVerify(token, secret, nonce)
    ).toThrowError(InvalidCredentialsError)
  })
})
