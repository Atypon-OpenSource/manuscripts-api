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

import { RegistrationController } from '../../../../../../src/Controller/V1/Registration/RegistrationController'
import { ValidationError } from '../../../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

describe('RegistrationController', () => {
  describe('signup', () => {
    test('should fail if the password is not a string', async () => {
      const req: any = {
        body: {
          email: 'valid-user@manuscriptsapp.com',
          password: 123,
          name: 'valid-user',
          isVerified: false
        }
      }

      const registrationController = new RegistrationController()
      return expect(registrationController.signup(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('verify', () => {
    test('should fail if the token is not string', () => {

      const req: any = {
        body: {
          token: 123
        }
      }
      const registrationController = new RegistrationController()
      return expect(registrationController.verify(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('requestVerificationEmail', () => {
    test('should fail if email is not string', () => {

      const req: any = {
        body: {
          email: 123
        }
      }
      const registrationController = new RegistrationController()
      return expect(registrationController.requestVerificationEmail(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('ConnectSignup', () => {
    test('should fail if email is not string', () => {
      const req: any = {
        body: {
          email: 123
        }
      }
      const registrationController = new RegistrationController()
      return expect(registrationController.connectSignup(req)).rejects.toThrowError(ValidationError)
    })
  })
})
