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

import { AES } from 'crypto-js'

import { validateAndGetState } from '../../../../../../src/Auth/Passport/Google'
import { InvalidClientApplicationStateError } from '../../../../../../src/Errors'
import { config } from '../../../../../../src/Config/Config'

describe('validateAndGetState', () => {
  test('should fail if the state is not valid JSON ', () => {
    expect(() => {
      validateAndGetState('foo')
    }).toThrowError(InvalidClientApplicationStateError)
  })

  test('should fail if deviceId is not string', () => {
    const state = JSON.stringify({
      appId: 'Application ID',
      deviceId: 123
    })

    const encryptedState = AES.encrypt(state, config.API.oauthStateEncryptionKey).toString()
    expect(() => {
      validateAndGetState(encryptedState)
    }).toThrowError(InvalidClientApplicationStateError)
  })

  test('should fail if invitationId is not string', () => {
    const state = JSON.stringify({
      appId: 'Application ID',
      deviceId: 'Device ID',
      invitationId: 123
    })

    const encryptedState = AES.encrypt(state, config.API.oauthStateEncryptionKey).toString()
    expect(() => {
      validateAndGetState(encryptedState)
    }).toThrowError(InvalidClientApplicationStateError)
  })

  test('should validate and return state ', () => {
    const state = JSON.stringify({
      appId: 'Application ID',
      deviceId: 'Device ID',
      invitationId: 'Invitation ID'
    })

    const encryptedState = AES.encrypt(state, config.API.oauthStateEncryptionKey).toString()
    return expect(
     validateAndGetState(encryptedState).appId
    ).toBe('Application ID')
  })
})
