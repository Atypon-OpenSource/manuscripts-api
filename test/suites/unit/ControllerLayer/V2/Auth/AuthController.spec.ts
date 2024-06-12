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

import '../../../../../utilities/dbMock'

import { describe } from 'jest-circus'

import { AuthController } from '../../../../../../src/Controller/V2/Auth/AuthController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('AuthController - serverToServerTokenAuth', () => {
  test('should call serverToServerAuth', async () => {
    DIContainer.sharedContainer.authenticationService.serverToServerTokenAuth = jest.fn()
    const payload = { deviceID: '123456', connectUserID: 'valid-connectId' }
    const authController = new AuthController()
    await authController.serverToServerTokenAuth(payload)
    expect(
      DIContainer.sharedContainer.authenticationService.serverToServerTokenAuth
    ).toHaveBeenCalled()
  })
})
