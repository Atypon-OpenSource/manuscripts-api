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
import * as jsonwebtoken from 'jsonwebtoken'
import { Chance } from 'chance'

import {
  AuthController,
  APP_ID_HEADER_KEY,
  APP_SECRET_HEADER_KEY
} from '../../../../../../src/Controller/V1/Auth/AuthController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  ValidationError,
  InvalidClientApplicationError,
  MissingQueryParameterError,
  InvalidCredentialsError,
  InvalidServerCredentialsError,
  InvalidBackchannelLogoutError,
  InvalidScopeNameError
} from '../../../../../../src/Errors'
import { log } from '../../../../../../src/Utilities/Logger'
import {
  authorizationHeader,
  ValidHeaderWithApplicationKey
} from '../../../../../data/fixtures/headers'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { AuthService } from '../../../../../../src/DomainServices/Auth/AuthService'
import { validLogoutToken } from '../../../../../data/fixtures/logoutTokens'
import { config } from '../../../../../../src/Config/Config'
import { ContainerService } from '../../../../../../src/DomainServices/Container/ContainerService'

jest.setTimeout(TEST_TIMEOUT)

jest.mock('request-promise-native')
const request = require('request-promise-native')

beforeEach(() => {
  request.mockClear()
  request.mockImplementation(() => ({ statusCode: 200 }));
  (DIContainer as any)._sharedContainer = null
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
        deviceId: chance.string()
      },
      headers: {
        [APP_ID_HEADER_KEY]: chance.string(),
        [APP_SECRET_HEADER_KEY]: chance.string()
      }
    }

    const authController = new AuthController()
    const authUser = await authController.login(req)
    expect(authService.login).toBeCalledWith({
      ...req.body,
      appId: req.headers[APP_ID_HEADER_KEY]
    })
    expect(authUser).toBeTruthy()
  })

  test('should fail if appId is not string', () => {
    const chance = new Chance()
    const req: any = {
      body: {
        email: chance.email(),
        password: chance.string(),
        deviceId: chance.string()
      },
      headers: {
        [APP_ID_HEADER_KEY]: chance.integer(),
        [APP_SECRET_HEADER_KEY]: chance.string()
      }
    }
    const authController = new AuthController()
    return expect(authController.login(req)).rejects.toThrowError(
      InvalidClientApplicationError
    )
  })

  test('should not call login function', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.login = jest.fn(() => true)

    const req: any = {
      body: {
        email: 123,
        password: 456
      },
      headers: {
        'manuscripts-app-id': 'manuscripts-client-1'
      }
    }

    const authController = new AuthController()
    return expect(authController.login(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should not call login function if the email is not string', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.login = jest.fn(() => true)

    const req: any = {
      body: {
        email: 123,
        password: 456
      },
      headers: {
        'manuscripts-app-id': 'manuscripts-client-1'
      }
    }

    const authController = new AuthController()
    return expect(authController.login(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('AuthController - serverToServerAuth', () => {
  test('should call serverToServerAuth function if email encoded in the token', async () => {
    const chance = new Chance()
    const authService: any = DIContainer.sharedContainer.authService

    authService.serverToServerAuth = jest.fn(() => true)
    const email = chance.email()

    const req: any = {
      body: { deviceId: chance.guid() },
      headers: {
        [APP_ID_HEADER_KEY]: chance.string(),
        authorization: `Bearer ${jsonwebtoken.sign(
          { email },
          config.auth.serverSecret
        )}`
      }
    }

    const authController = new AuthController()
    const authUser = await authController.serverToServerAuth(req)
    expect(authService.serverToServerAuth).toBeCalledWith({
      deviceId: req.body.deviceId,
      appId: req.headers[APP_ID_HEADER_KEY],
      email
    })
    expect(authUser).toBeTruthy()
  })

  test('should call serverToServerAuth function if connectUserID encoded in the token', async () => {
    const chance = new Chance()
    const authService: any = DIContainer.sharedContainer.authService

    authService.serverToServerAuth = jest.fn(() => true)
    const connectUserID = chance.guid()

    const req: any = {
      body: { deviceId: chance.guid() },
      headers: {
        [APP_ID_HEADER_KEY]: chance.string(),
        authorization: `Bearer ${jsonwebtoken.sign(
          { connectUserID },
          config.auth.serverSecret
        )}`
      }
    }

    const authController = new AuthController()
    const authUser = await authController.serverToServerAuth(req)
    expect(authService.serverToServerAuth).toBeCalledWith({
      deviceId: req.body.deviceId,
      appId: req.headers[APP_ID_HEADER_KEY],
      connectUserID
    })
    expect(authUser).toBeTruthy()
  })

  test('should fail if authorization header does not contain Bearer token', () => {
    const chance = new Chance()
    const req: any = {
      body: {
        deviceId: chance.guid()
      },
      headers: {
        [APP_ID_HEADER_KEY]: chance.string(),
        authorization: jsonwebtoken.sign(
          { email: chance.email() },
          config.auth.serverSecret
        )
      }
    }
    const authController = new AuthController()
    return expect(authController.serverToServerAuth(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should fail if appId is not a string', () => {
    const chance = new Chance()
    const req: any = {
      body: {
        deviceId: chance.guid()
      },
      headers: {
        [APP_ID_HEADER_KEY]: chance.integer(),
        authorization: `Bearer ${jsonwebtoken.sign(
          { connectUserID: chance.guid() },
          config.auth.serverSecret
        )}`
      }
    }
    const authController = new AuthController()
    return expect(authController.serverToServerAuth(req)).rejects.toThrowError(
      InvalidClientApplicationError
    )
  })

  test('should fail if deviceId is not a string', () => {
    const chance = new Chance()
    const req: any = {
      body: {
        deviceId: chance.integer()
      },
      headers: {
        [APP_ID_HEADER_KEY]: chance.string(),
        authorization: `Bearer ${jsonwebtoken.sign(
          { connectUserID: chance.guid() },
          config.auth.serverSecret
        )}`
      }
    }
    const authController = new AuthController()
    return expect(authController.serverToServerAuth(req)).rejects.toThrowError(
      InvalidCredentialsError
    )
  })

  test('should fail if token payload is not admin token payload', () => {
    const chance = new Chance()
    const req: any = {
      body: {
        deviceId: chance.string()
      },
      headers: {
        [APP_ID_HEADER_KEY]: chance.string(),
        authorization: `Bearer ${jsonwebtoken.sign(
          {},
          config.auth.serverSecret
        )}`
      }
    }
    const authController = new AuthController()
    return expect(authController.serverToServerAuth(req)).rejects.toThrowError(
      InvalidServerCredentialsError
    )
  })
})

describe('AuthController - logout', () => {
  test('should call logout function', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.logout = jest.fn()

    const chance = new Chance()
    const req: any = {
      headers: {
        authorization: 'Bearer ' + chance
      }
    }

    const authController = new AuthController()
    await authController.logout(req)
    expect(authService.logout).toBeCalled()
  })

  test('should fail to log out if the authorization header does not contain a bearer token', () => {
    const req: any = {
      headers: {
        authorization: 'valid token with no bearer prefix'
      }
    }
    const authController: AuthController = new AuthController()
    return expect(authController.logout(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should fail to log out if the authorization header is undefined', () => {
    const req: any = {
      headers: {
        authorization: undefined
      }
    }
    const authController: AuthController = new AuthController()
    return expect(authController.logout(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should fail to log out if the authorization header is an array', () => {
    const req: any = {
      headers: {
        authorization: ['a string', 'another string']
      }
    }
    const authController: AuthController = new AuthController()
    return expect(authController.logout(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('AuthController - sendPasswordResetInstructions', () => {
  test('should call sendPasswordResetInstructions function', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.sendPasswordResetInstructions = jest.fn(() =>
      Promise.resolve({})
    )

    const chance = new Chance()
    const req: any = {
      body: {
        email: chance.email()
      }
    }

    const authController = new AuthController()
    await authController.sendPasswordResetInstructions(req)
    expect(authService.sendPasswordResetInstructions).toBeCalledWith(
      req.body.email
    )
  })

  test('should not call sendPasswordResetInstructions function', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.sendPasswordResetInstructions = jest.fn(() =>
      Promise.resolve({})
    )

    const req: any = {
      body: {
        email: 123
      }
    }

    authService.sendPasswordResetInstructions = jest.fn(() =>
      Promise.resolve({})
    )

    const authController = new AuthController()
    return expect(
      authController.sendPasswordResetInstructions(req)
    ).rejects.toThrowError(ValidationError)
  })
})

describe('AuthController - resetPassword', () => {
  test('should call resetPassword function', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.resetPassword = jest.fn()

    const chance = new Chance()
    const req: any = {
      body: {
        password: chance.string(),
        token: chance.string(),
        deviceId: chance.string()
      },
      headers: {
        [APP_ID_HEADER_KEY]: 'bar',
        [APP_SECRET_HEADER_KEY]: 'foo'
      }
    }

    const authController = new AuthController()
    await authController.resetPassword(req)
    expect(authService.resetPassword).toBeCalled()
  })

  test('should not call resetPassword function', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.resetPassword = jest.fn()

    const req: any = {
      body: {
        password: 123,
        token: 456
      }
    }

    const authController = new AuthController()
    return expect(authController.resetPassword(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should not call resetPassword function with non string headers', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.resetPassword = jest.fn()

    const chance = new Chance()
    const req: any = {
      body: {
        password: chance.string(),
        token: chance.string(),
        deviceId: chance.string()
      },
      headers: {
        [APP_ID_HEADER_KEY]: 123,
        [APP_SECRET_HEADER_KEY]: 456
      }
    }
    const authController: AuthController = new AuthController()
    return expect(authController.resetPassword(req)).rejects.toThrowError(
      InvalidClientApplicationError
    )
  })
})


describe('AuthController - changePassword', () => {
  test('should call changePassword function', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    const chance = new Chance()
    const req: any = {
      user: {
        _id: 'foo'
      },
      body: {
        currentPassword: chance.string(),
        newPassword: chance.string(),
        deviceId: chance.string()
      }
    }

    authService.changePassword = jest.fn()

    AuthService.ensureValidAuthorizationBearer = jest.fn(
      (_param: string) => 'string' as any
    )
    const authController = new AuthController()
    await authController.changePassword(req)
    expect(authService.changePassword).toBeCalled()
  })

  test('should fail if user does not exist', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    const chance = new Chance()
    const req: any = {
      body: {
        currentPassword: chance.string(),
        newPassword: chance.string(),
        deviceId: chance.string()
      }
    }

    authService.changePassword = jest.fn()

    AuthService.ensureValidAuthorizationBearer = jest.fn(
      (_param: string) => 'string' as any
    )
    const authController = new AuthController()
    return expect(authController.changePassword(req)).rejects.toThrow(
      ValidationError
    )
  })

  test('should fail if password is not a string', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    const chance = new Chance()
    const req: any = {
      user: {
        _id: 'foo'
      },
      body: {
        currentPassword: chance.integer(),
        newPassword: chance.string(),
        deviceId: chance.string()
      }
    }

    authService.changePassword = jest.fn()

    AuthService.ensureValidAuthorizationBearer = jest.fn(
      (_param: string) => 'string' as any
    )
    const authController = new AuthController()
    return expect(authController.changePassword(req)).rejects.toThrow(
      ValidationError
    )
  })
})

describe('AuthController - iamOAuthCallback', () => {
  test('should fail if the id token is not a string', () => {
    const req: any = {
      query: {
        id_token: 123
      }
    }

    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback(req, {
        deviceId: '',
        redirectUri: '',
        theme: '',
        redirectBaseUri: ''
      })
    ).rejects.toThrow(MissingQueryParameterError)
  })

  test('should fail if state is missing', () => {
    const req: any = {
      query: {
        id_token: '123'
      }
    }

    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback(req, null as any)
    ).rejects.toThrow(MissingQueryParameterError)
  })

  test('should fail if deviceId is a number', () => {
    const req: any = {
      query: {
        id_token: '123'
      }
    }

    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback(req, {
        deviceId: 123 as any,
        redirectUri: '',
        theme: '',
        redirectBaseUri: ''
      })
    ).rejects.toThrow(MissingQueryParameterError)
  })

  test('should fail if redirectUri is a number', () => {
    const req: any = {
      query: {
        id_token: '123'
      }
    }

    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback(req, {
        redirectUri: 123 as any,
        deviceId: '',
        theme: '',
        redirectBaseUri: ''
      })
    ).rejects.toThrow(MissingQueryParameterError)
  })

  test('should fail if theme is a number', () => {
    const req: any = {
      query: {
        id_token: '123'
      }
    }

    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback(req, {
        theme: 123 as any,
        deviceId: '',
        redirectUri: '',
        redirectBaseUri: ''
      })
    ).rejects.toThrow(MissingQueryParameterError)
  })

  test('should fail if token payload is invalid', () => {
    const req: any = {
      query: {
        id_token: '123'
      }
    }

    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback(req, {
        theme: '',
        deviceId: '',
        redirectUri: '',
        redirectBaseUri: ''
      })
    ).rejects.toThrow(InvalidCredentialsError)
  })

  test('should generate a valid authorization token for the provided scope', async () => {
    const req: any = {
      user: {
        _id: 'User_foo'
      },
      params: {
        scope: 'jupyterhub'
      }
    }

    const authController = new AuthController()
    const token = await authController.createAuthorizationToken(req)
    expect(token).toBeDefined()

    const scopeInfo = ContainerService.findScope(req.params.scope, config.scopes)
    expect(() => jsonwebtoken.verify(token, scopeInfo.secret)).not.toThrow()
  })

  test('should fail for invalid scopes', async () => {
    const req: any = {
      user: {
        _id: 'User_foo'
      },
      params: {
        scope: null
      }
    }

    const authController = new AuthController()
    await expect(authController.createAuthorizationToken(req)).rejects.toThrow(ValidationError)
    await expect(authController.createAuthorizationToken({ ...req,params: { scope: 'foo' } })).rejects.toThrow(InvalidScopeNameError)
  })
})

describe('AuthController - backchannelLogout', () => {
  test('should fail if the logoutToken is not a string', () => {
    const authController = new AuthController()
    return expect(
      authController.backchannelLogout({
        query: { logout_token: 123 }
      } as any)
    ).rejects.toThrowError(InvalidBackchannelLogoutError)
  })

  test('should fail if the logoutToken is invalid', () => {
    const authController = new AuthController()
    return expect(
      authController.backchannelLogout({
        query: { logout_token: '123' }
      } as any)
    ).rejects.toThrowError(InvalidBackchannelLogoutError)
  })

  test('should call backchannelLogout', async () => {
    const authController = new AuthController()
    const authService = DIContainer.sharedContainer.authService

    authService.backchannelLogout = jest.fn()
    await authController.backchannelLogout({
      query: { logout_token: validLogoutToken }
    } as any)

    return expect(authService.backchannelLogout).toBeCalled()
  })
})

describe('AuthController - serverToServerTokenAuth', () => {
  test('should fail if the appId is not a string', async () => {
    const req: any = {
      headers: { ...ValidHeaderWithApplicationKey, 'manuscripts-app-id': 123 },
      body: {
        deviceId: 'valid-deviceId'
      },
      params: {
        connectUserID: 'valid-connectId'
      }
    }
    const authController = new AuthController()
    await expect(authController.serverToServerTokenAuth(req)).rejects.toThrow(InvalidClientApplicationError)
  })

  test('should fail if the deviceId is not a string', async () => {
    const req: any = {
      headers: { ...ValidHeaderWithApplicationKey },
      body: {
        deviceId: 123456
      },
      params: {
        connectUserID: 'valid-connectId'
      }
    }
    const authController = new AuthController()
    await expect(authController.serverToServerTokenAuth(req)).rejects.toThrow(InvalidCredentialsError)
  })

  test('should fail if the connectUserID is not a string', async () => {
    const req: any = {
      headers: { ...ValidHeaderWithApplicationKey },
      body: {
        deviceId: 'valid-deviceId'
      },
      params: {
        connectUserID: 123456
      }
    }
    const authController = new AuthController()
    await expect(authController.serverToServerTokenAuth(req)).rejects.toThrow(InvalidCredentialsError)
  })

  test('should call serverToServerAuth', async () => {
    DIContainer.sharedContainer.authService.serverToServerTokenAuth = jest.fn()
    const req: any = {
      headers: { ...ValidHeaderWithApplicationKey },
      body: {
        deviceId: 'valid-deviceId'
      },
      params: {
        connectUserID: 'valid-connectId'
      }
    }
    const authController = new AuthController()
    await authController.serverToServerTokenAuth(req)
    expect(DIContainer.sharedContainer.authService.serverToServerTokenAuth).toBeCalled()
  })
})
