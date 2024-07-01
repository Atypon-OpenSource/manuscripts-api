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

import '../../../../utilities/dbMock'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { DuplicateEmailError } from '../../../../../src/Errors'
import { ConnectSignupCredentials } from '../../../../../src/Models/UserModels'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('Registration - connectSignup', () => {
  test('should fail if user already exist', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.registerationService
    const userClient = DIContainer.sharedContainer.userClient
    userClient.findByEmail = jest.fn().mockResolvedValue({
      connectUserID: 'valid-connectId',
      family: 'name',
      given: 'valid',
      email: 'valid-email',
    })

    const cred: ConnectSignupCredentials = {
      email: 'valid-email',
      name: 'valid name',
      connectUserID: 'valid-connectId',
    }
    return expect(userRegistrationService.connectSignup(cred)).rejects.toThrow(DuplicateEmailError)
  })
  test('should successfully signup a new user', async () => {
    const userRegistrationService: any = DIContainer.sharedContainer.registerationService
    const eventService = DIContainer.sharedContainer.eventManager
    const userClient = DIContainer.sharedContainer.userClient
    userClient.findByEmail = jest.fn().mockResolvedValue(null)
    eventService.emitUserEvent = jest.fn()
    userClient.createUser = jest.fn().mockResolvedValue({
      connectUserID: 'new-valid-connectId',
      family: 'family',
      given: 'given',
      email: 'new-valid-email',
    })

    const cred: ConnectSignupCredentials = {
      email: 'new-valid-email',
      name: 'given family',
      connectUserID: 'new-valid-connectId',
    }

    await expect(userRegistrationService.connectSignup(cred)).resolves.toEqual({
      connectUserID: 'new-valid-connectId',
      family: 'family',
      given: 'given',
      email: 'new-valid-email',
    })

    expect(userClient.createUser).toHaveBeenCalledWith({
      email: 'new-valid-email',
      given: 'given',
      family: 'family',
      connectUserID: 'new-valid-connectId',
    })
  })
})
