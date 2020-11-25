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

import { parse } from 'qs'

import '../../../../../utilities/dbMock'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { config } from '../../../../../../src/Config/Config'
import { AuthService } from '../../../../../../src/DomainServices/Auth/AuthService'
const url = require('url')

jest.setTimeout(TEST_TIMEOUT)

describe('IAMAuthService', () => {
  beforeEach(() => {
    (DIContainer as any)._sharedContainer = null
    return DIContainer.init()
  })

  test('should return expected IAM OAuth error url', () => {
    const errorMessage = DIContainer.sharedContainer.authService.iamOAuthErrorURL(
      'error message'
    )
    expect(errorMessage).toBe(
      `${config.IAM.libraryURL}/login#error=error&error_description=error%20message`
    )
  })

  test('should encode IAM state correctly', () => {
    const state = {
      deviceId: '123',
      redirectUri: '/test',
      theme: 'foo'
    }
    expect(AuthService.encodeIAMState(state)).toBe(
      Buffer.from('deviceId=123:redirectUri=/test:theme=foo').toString('base64')
    )
  })

  test('should decode IAM state correctly', () => {
    const state = {
      deviceId: '123',
      redirectUri: '/test',
      theme: 'foo'
    }
    const encodedState = AuthService.encodeIAMState(state)
    const {
      deviceId,
      redirectUri,
      theme
    } = DIContainer.sharedContainer.authService.decodeIAMState(encodedState)
    expect(deviceId).toBe(state.deviceId)
    expect(redirectUri).toBe(state.redirectUri)
    expect(theme).toBe(state.theme)
  })

  test('should return expected IAM OAuth start url', async () => {
    const deviceId = '123456'
    const redirectUri = '/login'
    const theme = 'themeA'
    const OAuthStartUrl = (await DIContainer.sharedContainer.authService.iamOAuthStartData(
      {
        deviceId,
        redirectUri,
        theme
      }
    )).url
    const parsedStartURL = url.parse(OAuthStartUrl)
    const queryObj = parse(parsedStartURL.query)
    const { scope, response_type, client_id, nonce, state } = queryObj
    const {
      redirectUri: retrievedRedirectUri,
      deviceId: retrievedDeviceId,
      theme: retrievedTheme
    } = DIContainer.sharedContainer.authService.decodeIAMState(state)
    expect(parsedStartURL.host).toBe(
      url.parse(`${config.IAM.libraryURL}`).host
    )
    expect(scope).toBe('openid')
    expect(response_type).toBe('id_token')
    expect(client_id).toBe('test')
    expect(nonce).toHaveLength(40)
    expect(retrievedDeviceId).toBe(deviceId)
    expect(retrievedRedirectUri).toBe(redirectUri)
    expect(retrievedTheme).toBe(theme)
  })
})
