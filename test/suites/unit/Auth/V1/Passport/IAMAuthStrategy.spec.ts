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

import { AuthStrategy } from '../../../../../../src/Auth/Passport/AuthStrategy'
import { MissingCookieError } from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
const mocRes = require('jest-mock-express')

const DATE_TO_USE = new Date(1542834189 * 1000)
const _Date = Date
const nowFunc = Date.now

describe('IAMAuthStrategy', () => {
  beforeAll(() => {
    (DIContainer as any)._sharedContainer = {
      jwksClient: {
        getSigningKey: (_: string, callback: Function) => {
          callback(
            null,
            'public-key-that-will-not-be-used-because-the-iam-token-verified-below-is-faked-too'
          )
        }
      },
      iamTokenVerifier: { loginVerify: () => Promise.resolve(), isValidIssuer: () => true },
      authService: {
        decodeIAMState: (_: any) => ({
          redirectUri: ''
        })
      }
    } as any
    global.Date.now = jest.fn(() => +DATE_TO_USE)
    return true
  })

  test('verifyIAMToken valid token should not throw error', async () => {
    let req: any = {}
    // valid token
    req = {
      query: {
        id_token: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIyMzI3YTdhNS0zYmNhLTQ4NzctYTFkYy1hNTA2NTBlNWMxZjEiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaWFtLXRlc3QuYXR5cG9uLmNvbSIsInBob25lX251bWJlcl92ZXJpZmllZCI6ZmFsc2UsImdpdmVuX25hbWUiOiJQYXVsIiwidHlwZSI6InJlZ2lzdGVyZWQiLCJub25jZSI6IjM2MmZmMDlhNGYiLCJzaWQiOiIzYzU1ZWE5Yy05ODNlLTQ1ZmMtYjBhNi02MjllZTZiNGQ1YTQiLCJhdWQiOiJsaWJyYXJ5IiwibmFtZSI6IlBhdWwgQ29ubm9sbHkiLCJwaG9uZV9udW1iZXIiOiIiLCJleHAiOjE1NDQxMzAxODksImlhdCI6MTU0MTUzODE4OSwiZmFtaWx5X25hbWUiOiJDb25ub2xseSIsImVtYWlsIjoicGNvbm5vbGx5QGF0eXBvbi5jb20ifQ.',
        state: ''
      },
      headers: {
        cookie: 'nonce=362ff09a4f'
      }
    }
    const res: any = mocRes.response()
    const next = jest.fn()

    AuthStrategy.verifyIAMToken(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toEqual(undefined)
  })

  test('verifyIAMToken with missing cookie should throw error', async () => {
    const req: any = {}
    // invalid token. it is missing the nonce
    req.query = {
      id_token:
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyMzI3YTdhNS0zYmNhLTQ4NzctYTFkYy1hNTA2NTBlNWMxZjEiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaWFtLXRlc3QuYXR5cG9uLmNvbSIsInBob25lX251bWJlcl92ZXJpZmllZCI6ZmFsc2UsImdpdmVuX25hbWUiOiJQYXVsIiwidHlwZSI6InJlZ2lzdGVyZWQiLCJzaWQiOiIzYzU1ZWE5Yy05ODNlLTQ1ZmMtYjBhNi02MjllZTZiNGQ1YTQiLCJhdWQiOiJsaWJyYXJ5IiwibmFtZSI6IlBhdWwgQ29ubm9sbHkiLCJwaG9uZV9udW1iZXIiOiIiLCJleHAiOjE1NDE1NDM3ODMsImlhdCI6MTU0MTUzODE4OSwiZmFtaWx5X25hbWUiOiJDb25ub2xseSIsImVtYWlsIjoicGNvbm5vbGx5QGF0eXBvbi5jb20iLCJqdGkiOiIxOGJkNDYwNi1mN2ZkLTRlMTctYWZjOS01OTM4YzNmYzM2YmUifQ.Z356w0MfeS4AfHbsm9VLH1cJ5wLs8Y72CkTBQTq6Cc4'
    }

    req.headers = {}

    const res: any = mocRes.response()
    const next = jest.fn()

    AuthStrategy.verifyIAMToken(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(MissingCookieError)
  })

  afterAll(() => {
    global.Date = _Date
    global.Date.now = nowFunc
  })
})
