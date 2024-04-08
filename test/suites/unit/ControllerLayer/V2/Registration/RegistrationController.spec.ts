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

import { Chance } from 'chance'

import { RegistrationController } from '../../../../../../src/Controller/V2/Registration/RegistrationController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ValidationError } from '../../../../../../src/Errors'
import { validBody2 } from '../../../../../data/fixtures/credentialsRequestPayload'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('RegistrationController', () => {
  describe('connectSignup', () => {
    test('should fail to create user if email is not string', async () => {
      const req: any = {
        body: {
          email: 123,
        },
      }
      const registrationController: RegistrationController = new RegistrationController()
      await expect(registrationController.connectSignup(req)).rejects.toThrow(ValidationError)
    })

    test('should fail to create user if email/name/connectId is not string', async () => {
      const regService: any = DIContainer.sharedContainer.userRegistrationService
      regService.connectSignup = jest.fn()
      const chance = new Chance()
      const req: any = {
        body: {
          email: validBody2.email,
          name: chance.string(),
          connectUserID: chance.string(),
        },
      }
      const registrationController: RegistrationController = new RegistrationController()
      await registrationController.connectSignup(req)
      expect(regService.connectSignup).toHaveBeenCalled()
    })
  })
})
