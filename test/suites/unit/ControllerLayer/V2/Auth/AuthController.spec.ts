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

import '../../../../../utilities/configMock'
import '../../../../../utilities/dbMock'

import { describe } from 'jest-circus'

import { AuthController } from '../../../../../../src/Controller/V2/Auth/AuthController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { InvalidCredentialsError } from '../../../../../../src/Errors'
import { ValidHeaderWithApplicationKey } from '../../../../../data/fixtures/headers'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('AuthController - serverToServerTokenAuth', () => {
  test('should fail if the deviceId is not a string', async () => {
    const req: any = {
      headers: { ...ValidHeaderWithApplicationKey },
      body: {
        deviceId: 123456,
      },
      params: {
        connectUserID: 'valid-connectId',
      },
    }
    const authController = new AuthController()
    await expect(authController.serverToServerTokenAuth(req)).rejects.toThrow(
      InvalidCredentialsError
    )
  })

  test('should fail if the connectUserID is not a string', async () => {
    const req: any = {
      headers: { ...ValidHeaderWithApplicationKey },
      body: {
        deviceId: 'valid-deviceId',
      },
      params: {
        connectUserID: 123456,
      },
    }
    const authController = new AuthController()
    await expect(authController.serverToServerTokenAuth(req)).rejects.toThrow(
      InvalidCredentialsError
    )
  })

  test('should call serverToServerAuth', async () => {
    DIContainer.sharedContainer.authService.serverToServerTokenAuth = jest.fn()
    const req: any = {
      headers: { ...ValidHeaderWithApplicationKey },
      body: {
        deviceId: 'valid-deviceId',
      },
      params: {
        connectUserID: 'valid-connectId',
      },
    }
    const authController = new AuthController()
    await authController.serverToServerTokenAuth(req)
    expect(DIContainer.sharedContainer.authService.serverToServerTokenAuth).toHaveBeenCalled()
  })
})
