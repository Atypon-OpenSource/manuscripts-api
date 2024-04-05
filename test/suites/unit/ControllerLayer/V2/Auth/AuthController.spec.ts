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
import '../../../../../utilities/configMock'

import { Chance } from 'chance'
import { describe } from 'jest-circus'
import jwt from 'jsonwebtoken'

import { ScopedAccessTokenConfiguration } from '../../../../../../src/Config/ConfigurationTypes'
import {
  APP_ID_HEADER_KEY,
  APP_SECRET_HEADER_KEY,
  AuthController,
} from '../../../../../../src/Controller/V2/Auth/AuthController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ContainerService } from '../../../../../../src/DomainServices/Container/ContainerService'
import {
  InvalidClientApplicationError,
  InvalidCredentialsError,
  ValidationError,
} from '../../../../../../src/Errors'
import { ValidHeaderWithApplicationKey } from '../../../../../data/fixtures/headers'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('AuthController - login', () => {
  test('should call login function', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.login = jest.fn(() => true)

    const chance = new Chance()
    const req: any = {
      body: {
        email: chance.email(),
        password: chance.string(),
        deviceId: chance.string(),
      },
      headers: {
        [APP_ID_HEADER_KEY]: chance.string(),
        [APP_SECRET_HEADER_KEY]: chance.string(),
      },
    }

    const authController = new AuthController()
    const authUser = await authController.login(req)
    expect(authService.login).toHaveBeenCalledWith({
      ...req.body,
      appId: req.headers[APP_ID_HEADER_KEY],
    })
    expect(authUser).toBeTruthy()
  })

  test('should fail if password is an empty string', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.login = jest.fn(() => true)

    const chance = new Chance()
    const req: any = {
      body: {
        email: chance.email(),
        password: '',
        deviceId: chance.string(),
      },
      headers: {
        [APP_ID_HEADER_KEY]: chance.string(),
        [APP_SECRET_HEADER_KEY]: chance.string(),
      },
    }

    const authController = new AuthController()
    await expect(authController.login(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if appId is not string', () => {
    const chance = new Chance()
    const req: any = {
      body: {
        email: chance.email(),
        password: chance.string(),
        deviceId: chance.string(),
      },
      headers: {
        [APP_ID_HEADER_KEY]: chance.integer(),
        [APP_SECRET_HEADER_KEY]: chance.string(),
      },
    }
    const authController = new AuthController()
    return expect(authController.login(req)).rejects.toThrow(InvalidClientApplicationError)
  })

  test('should not call login function', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.login = jest.fn(() => true)

    const req: any = {
      body: {
        email: 123,
        password: 456,
      },
      headers: {
        'manuscripts-app-id': 'manuscripts-client-1',
      },
    }

    const authController = new AuthController()
    return expect(authController.login(req)).rejects.toThrow(ValidationError)
  })

  test('should not call login function if the email is not string', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.login = jest.fn(() => true)

    const req: any = {
      body: {
        email: 123,
        password: 456,
      },
      headers: {
        'manuscripts-app-id': 'manuscripts-client-1',
      },
    }

    const authController = new AuthController()
    return expect(authController.login(req)).rejects.toThrow(ValidationError)
  })
})

describe('AuthController - serverToServerTokenAuth', () => {
  test('should fail if the appId is not a string', async () => {
    const req: any = {
      headers: { ...ValidHeaderWithApplicationKey, 'manuscripts-app-id': 123 },
      body: {
        deviceId: 'valid-deviceId',
      },
      params: {
        connectUserID: 'valid-connectId',
      },
    }
    const authController = new AuthController()
    await expect(authController.serverToServerTokenAuth(req)).rejects.toThrow(
      InvalidClientApplicationError
    )
  })

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

describe('scoped authorization token', () => {
  test('should fail if user not found', async () => {
    const req: any = {
      params: {
        scope: 'pressroom',
      },
    }
    const authController = new AuthController()
    await expect(authController.createAuthorizationToken(req)).rejects.toThrow(ValidationError)
  })

  test('should fail if scope is not found', async () => {
    const req: any = {
      params: {},
      user: {
        connectUserID: 'someId',
      },
    }
    const authController = new AuthController()
    await expect(authController.createAuthorizationToken(req)).rejects.toThrow(ValidationError)
  })

  test('should call jwt.sign', async () => {
    ContainerService.findScope = (): ScopedAccessTokenConfiguration => {
      return {
        expiry: 0,
        identifier: 'identifier',
        name: 'name',
        publicKeyJWK: null,
        publicKeyPEM: null,
        secret: 'secret',
      }
    }
    ContainerService.userIdForSync = () => validUser._id
    jwt.sign = jest.fn()
    const req: any = {
      params: {
        scope: 'pressroom',
      },
      user: {
        connectUserID: 'valid-connectId',
      },
    }
    const authController = new AuthController()
    await authController.createAuthorizationToken(req)
    expect(jwt.sign).toHaveBeenCalled()
  })
})
