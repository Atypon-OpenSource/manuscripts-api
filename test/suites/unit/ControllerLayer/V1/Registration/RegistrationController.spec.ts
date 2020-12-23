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

import { Chance } from 'chance'
import '../../../../../utilities/dbMock'

import { RegistrationController } from '../../../../../../src/Controller/V1/Registration/RegistrationController'
import { ValidationError } from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('RegistrationController', () => {
  describe('signup', () => {
    test('should make signup service call when given valid input data', async () => {
      const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
      const chance = new Chance()
      const req: any = {
        body: {
          email: chance.email(),
          password: chance.string(),
          name: chance.string(),
          isVerified: false
        },
        headers: {
        }
      }
      userRegistrationService.signup = jest.fn()

      const registrationController: RegistrationController = new RegistrationController()
      await registrationController.signup(req)

      expect(userRegistrationService.signup).toBeCalled()

    })

    test('should not call signup service when given a numerical password', () => {
      const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
      const chance = new Chance()
      const req: any = {
        body: {
          email: chance.email(),
          password: 456,
          name: 123,
          isVerified: false
        }
      }

      userRegistrationService.signup = jest.fn()

      const registrationController: RegistrationController = new RegistrationController()
      return expect(registrationController.signup(req)).rejects.toThrowError(ValidationError)
    })

    test('should not call signup service when given an authorization header without a bearer token', () => {
      const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
      const chance = new Chance()
      const req: any = {
        body: {
          email: chance.email(),
          password: 456,
          name: 123,
          isVerified: false
        },
        headers: {
          authorization : chance.string()
        }
      }

      userRegistrationService.signup = jest.fn()

      const registrationController: RegistrationController = new RegistrationController()
      return expect(registrationController.signup(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('verify', () => {
    test('should make a registration service verification when given a string typed token', async () => {
      const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
      const chance = new Chance()
      const req: any = {
        body: {
          token: chance.string()
        }
      }

      userRegistrationService.verify = jest.fn()

      const registrationController: RegistrationController = new RegistrationController()
      await registrationController.verify(req)

      expect(userRegistrationService.verify).toBeCalled()
    })

    test('should not call verify function', () => {
      const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
      const req: any = {
        body: {
          token: 123
        }
      }
      userRegistrationService.verify = jest.fn()

      const registrationController: RegistrationController = new RegistrationController()
      return expect(registrationController.verify(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('requestVerificationEmail', () => {
    test('should fail to verify user when passed an invalid token', async () => {
      const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
      const chance = new Chance()
      const req: any = {
        body: {
          email: chance.email()
        }
      }

      userRegistrationService.requestVerificationEmail = jest.fn()

      const registrationController: RegistrationController = new RegistrationController()
      await registrationController.requestVerificationEmail(req)

      expect(userRegistrationService.requestVerificationEmail).toBeCalled()
    })

    test('should fail if email is not a string', () => {
      const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
      const req: any = {
        body: {
          email: 123
        }
      }
      userRegistrationService.requestVerificationEmail = jest.fn()
      const registrationController: RegistrationController = new RegistrationController()

      return expect(registrationController.requestVerificationEmail(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('connectSignup', () => {
    test('should fail to create user if email/name/connectId is not string', async () => {
      const req: any = {
        body: {
          email: 123
        }
      }
      const registrationController: RegistrationController = new RegistrationController()
      await expect(registrationController.connectSignup(req)).rejects.toThrowError(ValidationError)
    })
  })
})
