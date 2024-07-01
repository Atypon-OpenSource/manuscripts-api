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

import { UserController } from '../../../../../../src/Controller/V2/User/UserController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ValidationError } from '../../../../../../src/Errors'
import { log } from '../../../../../../src/Utilities/Logger'
import { authorizationHeader } from '../../../../../data/fixtures/headers'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})
describe('UserController', () => {
  describe('UserController - getProfile', () => {
    test('should call profile()', async () => {
      const userService: any = DIContainer.sharedContainer.userService
      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
      }

      userService.profile = jest.fn(() => {
        log.debug('getProfile function called')
        return Promise.resolve(null)
      })

      const userController: UserController = new UserController()
      await userController.getProfile(req)

      expect(userService.profile).toHaveBeenCalled()
    })

    test('getProfile should fail if the token is not a bearer token', () => {
      const chance = new Chance()
      const req: any = {
        headers: {
          authorization: chance.string(),
        },
      }

      const userController: UserController = new UserController()
      return expect(userController.getProfile(req)).rejects.toThrow(ValidationError)
    })

    test('getProfile should fail if the token is undefined', () => {
      const req: any = {
        headers: {
          authorization: undefined,
        },
      }

      const userController: UserController = new UserController()
      return expect(userController.getProfile(req)).rejects.toThrow(ValidationError)
    })

    test('getProfile should fail if the token is array', () => {
      const chance = new Chance()
      const req: any = {
        headers: {
          authorization: [chance.string(), chance.string()],
        },
      }

      const userController: UserController = new UserController()
      return expect(userController.getProfile(req)).rejects.toThrow(ValidationError)
    })
  })

  describe('UserController - userContainers', () => {
    test('should call getUserContainers', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer ' + new Chance().string(),
        },
        user: validUser,
      }

      const projectClient = DIContainer.sharedContainer.projectClient

      projectClient.userProjects = jest.fn()

      const userController = new UserController()
      await userController.userProjects(req)

      return expect(projectClient.userProjects).toHaveBeenCalled()
    })
  })
})
