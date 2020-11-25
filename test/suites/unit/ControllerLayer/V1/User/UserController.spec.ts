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

import { log } from '../../../../../../src/Utilities/Logger'
import { UserController } from '../../../../../../src/Controller/V1/User/UserController'
import { ValidationError } from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { authorizationHeader } from '../../../../../data/fixtures/headers'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { validUser } from '../../../../../data/fixtures/userServiceUser'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('UserController', () => {
  test('should call markUserForDeletion()', async () => {
    const userService: any = DIContainer.sharedContainer.userService
    const req: any = {
      body: {},
      user: { _id: 'foo' }
    }

    userService.markUserForDeletion = jest.fn(() => {
      log.debug('markUserForDeletion function called')
    })

    const userController: UserController = new UserController()
    await userController.markUserForDeletion(req)

    expect(userService.markUserForDeletion).toBeCalled()
  })

  test('should call unmarkUserForDeletion()', async () => {
    const userService: any = DIContainer.sharedContainer.userService
    const req: any = {
      user: { _id: 'foo' }
    }

    userService.unmarkUserForDeletion = jest.fn(() => {
      log.debug('unmarkUserForDeletion function called')
    })

    const userController: UserController = new UserController()
    await userController.unmarkUserForDeletion(req)

    expect(userService.unmarkUserForDeletion).toBeCalled()
  })

  test('unmarkUserForDeletion should fail if user not found', () => {
    const req: any = {
      body: {}
    }

    const userController: UserController = new UserController()
    return expect(userController.unmarkUserForDeletion(req)).rejects.toThrowError(ValidationError)
  })

  test('markUserForDeletion should fail if the password defined but it is not a string', () => {
    const chance = new Chance()
    const req: any = {
      body: {
        password: chance.integer()
      },
      user: { _id: 'foo' }
    }

    const userController: UserController = new UserController()
    return expect(userController.markUserForDeletion(req)).rejects.toThrowError(ValidationError)
  })

  test('markUserForDeletion should fail if user not found', () => {
    const req: any = {
      body: {}
    }

    const userController: UserController = new UserController()
    return expect(userController.markUserForDeletion(req)).rejects.toThrowError(ValidationError)
  })

})

describe('UserController - getProfile', () => {
  test('should call profile()', async () => {
    const userService: any = DIContainer.sharedContainer.userService
    const chance = new Chance()
    const req: any = {
      headers: authorizationHeader(chance.string())
    }

    userService.profile = jest.fn(() => {
      log.debug('getProfile function called')
      return Promise.resolve(null)
    })

    const userController: UserController = new UserController()
    await userController.getProfile(req)

    expect(userService.profile).toBeCalled()
  })

  test('getProfile should fail if the token is not a bearer token', () => {
    const chance = new Chance()
    const req: any = {
      headers: {
        authorization: chance.string()
      }
    }

    const userController: UserController = new UserController()
    return expect(userController.getProfile(req)).rejects.toThrowError(ValidationError)
  })

  test('getProfile should fail if the token is undefined', () => {
    const req: any = {
      headers: {
        authorization: undefined
      }
    }

    const userController: UserController = new UserController()
    return expect(userController.getProfile(req)).rejects.toThrowError(ValidationError)
  })

  test('getProfile should fail if the token is array', () => {
    const chance = new Chance()
    const req: any = {
      headers: {
        authorization: [chance.string(), chance.string()]
      }
    }

    const userController: UserController = new UserController()
    return expect(userController.getProfile(req)).rejects.toThrowError(ValidationError)
  })
})

describe('UserController - userContainers', () => {
  test('should call getUserProjects', async () => {
    const req: any = {
      headers: {
        authorization: 'Bearer ' + new Chance().string()
      },
      user: validUser
    }

    const projectRepository = DIContainer.sharedContainer.projectRepository

    projectRepository.getUserProjects = jest.fn()

    const userController = new UserController()
    await userController.userContainers(req)

    return expect(projectRepository.getUserProjects).toBeCalled()
  })
})
