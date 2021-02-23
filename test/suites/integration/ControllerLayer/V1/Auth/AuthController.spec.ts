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

import { testDatabase } from '../../../../../utilities/db'
import {
  AuthController,
  APP_ID_HEADER_KEY
} from '../../../../../../src/Controller/V1/Auth/AuthController'
import {
  ValidationError,
  MissingQueryParameterError,
  InvalidCredentialsError,
  InvalidBackchannelLogoutError,
  InvalidClientApplicationError
} from '../../../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import DiscourseSSO from 'discourse-sso'
import { generateLoginToken } from '../../../../../../src/Utilities/JWT/LoginTokenPayload'
import { DiscourseController } from '../../../../../../src/DomainServices/Discourse/DiscourseController'
import { DiscourseService } from '../../../../../../src/DomainServices/Discourse/DiscourseService'
import { ValidHeaderWithApplicationKey } from '../../../../../data/fixtures/headers'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase()))
afterAll(() => db.bucket.disconnect())

describe('AuthController - login', () => {
  test('should not call login function because email should be strings', () => {
    const req: any = {
      body: { email: 12345, password: '123456' },
      headers: { [APP_ID_HEADER_KEY]: 'foobar' }
    }

    const authController = new AuthController()
    return expect(authController.login(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should not call login function because password should be non-empty string', () => {
    const req: any = {
      body: { email: 'test@test.com', password: '' },
      headers: { [APP_ID_HEADER_KEY]: 'foobar' }
    }

    const authController = new AuthController()
    return expect(authController.login(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('AuthController - loginDiscourse', () => {
  test('loginDiscourse', () => {
    const reqWithoutSSO: any = {
      query: { sig: 'y' },
      headers: {}
    }
    const discourseService: any = new DiscourseService({
      ssoSecret: 'much secret, very wow',
      url: 'http://foobar.com',
      feedbackCategoryID: '123',
      apiKey: 'x',
      adminUsername: 'y'
    })
    const discourseController: any = new DiscourseController(discourseService)

    expect(() =>
      discourseController.discourseLogin(reqWithoutSSO)
    ).toThrowError(MissingQueryParameterError)

    const reqWithoutSig: any = {
      query: { sso: 'x' },
      headers: {}
    }

    expect(() =>
      discourseController.discourseLogin(reqWithoutSig)
    ).toThrowError(MissingQueryParameterError)

    const reqWithoutHeaders: any = {
      query: { sig: 'x', sso: 'y' }
    }

    expect(() =>
      discourseController.discourseLogin(reqWithoutHeaders)
    ).toThrowError(ValidationError)

    const reqWithHeaders: any = {
      query: { sig: 'x', sso: 'y' },
      headers: { authorization: 'Bearer derp' }
    }

    expect(() =>
      discourseController.discourseLogin(reqWithHeaders)
    ).toThrowError(InvalidCredentialsError)

    const goodAuthPayload = {
      tokenId: 'foo',
      userId: 'bar',
      appId: 'foobar',
      email: 'foo@bar.com',
      userProfileId: 'foo'
    }

    // going through the encode & decode hoops as encoding adds the 'iat' property.
    const authToken = generateLoginToken(goodAuthPayload, null)
    const goodReq: any = {
      query: { sig: 'x', sso: 'y' },
      headers: { authorization: `Bearer ${authToken}` }
    }

    discourseController.discourseRedirectURL = jest.fn()
    const authService: any = DIContainer.sharedContainer.authService
    authService.discourseSSO = new DiscourseSSO('x')
    authService.discourseURL = 'https://foobar.com'
    expect(() => discourseController.discourseLogin(goodReq)).toThrowError(
      ValidationError
    )

    // echo -n 'nonce=x' | base64 | openssl dgst -sha256 -hmac 'much secret, very wow' -binary | base64
    const correctlySignedReq: any = {
      query: {
        sig: '6648376284f212b08cc66f18fc8a8f188bcf16072944add79be71939a3c8b218',
        sso: 'bm9uY2U9dmVyeV93b3dfbXVjaF9iYXNlNjRfc29fcXVlcnk='
      },
      headers: { authorization: `Bearer ${authToken}` }
    }
    authService.discourseSSO = new DiscourseSSO('much secret, very wow')
    const loginResponse = discourseController.discourseLogin(
      correctlySignedReq
    )
    expect(loginResponse.url).toBeTruthy()
  })
})

describe('AuthController - sendPasswordResetInstructions', () => {
  test('should not call sendPasswordResetInstructions function because email should be present', () => {
    const req: any = {
      body: {}
    }
    const authController = new AuthController()
    return expect(
      authController.sendPasswordResetInstructions(req)
    ).rejects.toThrowError(ValidationError)
  })

  test('should not call sendPasswordResetInstructions function because email should be string', () => {
    const req: any = {
      body: {
        email: 12345
      }
    }
    const authController = new AuthController()
    return expect(
      authController.sendPasswordResetInstructions(req)
    ).rejects.toThrowError(ValidationError)
  })
})

describe('AuthController - resetPassword', () => {
  test('should not call resetPassword function because password & token should be strings', () => {
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

  test('should not call resetPassword function because token should be string', () => {
    const req: any = {
      body: {
        password: '123',
        token: 456
      }
    }
    const authController = new AuthController()

    return expect(authController.resetPassword(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('AuthController - logout', () => {
  test('should not call logout function because token is undefined', () => {
    const req: any = {
      headers: {
        authorization: undefined
      }
    }
    const authController = new AuthController()

    return expect(authController.logout(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should not call logout function because token is an array', () => {
    const req: any = {
      headers: {
        authorization: ['A string', 'Also a string']
      }
    }
    const authController = new AuthController()

    return expect(authController.logout(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('AuthController - refreshSyncSessions', () => {
  test('should throw in refreshSyncSessions when token is undefined', () => {
    const req: any = {
      headers: {
        authorization: undefined
      }
    }
    const authController = new AuthController()

    return expect(authController.refreshSyncSessions(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should throw in refreshSyncSessions when token is an array', () => {
    const req: any = {
      headers: {
        authorization: ['A string', 'Also a string']
      }
    }
    const authController = new AuthController()

    return expect(authController.refreshSyncSessions(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('AuthController - changePassword', () => {
  test('should fail to changePassword if the user not found', () => {
    const req: any = {
      body: {
        currentPassword: '123',
        newPassword: '12345',
        deviceId: 'device-id'
      }
    }
    const authController = new AuthController()

    return expect(authController.changePassword(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should not call changePassword function because currentPassword & newPassword should be strings', () => {
    const req: any = {
      user: {
        _id: 'foo'
      },
      body: {
        currentPassword: 123,
        newPassword: '12345',
        deviceId: 'device-id'
      }
    }

    const authController = new AuthController()

    return expect(authController.changePassword(req)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('AuthController - iamOAuthCallback', () => {
  test('should fail IAM OAuth callback with numerical id_token', () => {
    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback({ query: { id_token: 1 } } as any, {
        deviceId: 'foo',
        redirectUri: null,
        theme: null,
        redirectBaseUri: ''
      })
    ).rejects.toThrowError(MissingQueryParameterError)
  })

  test('should fail IAM OAuth callback with null id_token', () => {
    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback({ query: { id_token: null } } as any, {
        deviceId: 'foo',
        redirectUri: null,
        theme: null,
        redirectBaseUri: ''
      })
    ).rejects.toThrowError(MissingQueryParameterError)
  })

  test('should fail IAM OAuth callback with null state', () => {
    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback(
        { query: { id_token: 'foo' } } as any,
        null as any
      )
    ).rejects.toThrowError(MissingQueryParameterError)
  })

  test('should fail IAM OAuth callback with numerical state', () => {
    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback(
        { query: { id_token: 'foo' } } as any,
        { deviceId: '1', redirectUri: null, theme: 3 } as any
      )
    ).rejects.toThrowError(MissingQueryParameterError)
  })

  test('should fail IAM OAuth callback with false token', () => {
    const authController = new AuthController()
    return expect(
      authController.iamOAuthCallback(
        { query: { id_token: 'foo' } } as any,
        { deviceId: '123', redirectUri: null, theme: '3' } as any
      )
    ).rejects.toThrowError(InvalidCredentialsError)
  })
})

describe('AuthController - backchannelLogout', () => {
  test('should fail if the logoutToken is not a string', () => {
    const authController = new AuthController()
    return expect(
      authController.backchannelLogout(
        { query: { logout_token: 123 } } as any
      )
    ).rejects.toThrowError(InvalidBackchannelLogoutError)
  })

  test('should fail if the logoutToken is invalid', () => {
    const authController = new AuthController()
    return expect(
      authController.backchannelLogout(
        { query: { logout_token: '123' } } as any
      )
    ).rejects.toThrowError(InvalidBackchannelLogoutError)
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
      headers: { ...ValidHeaderWithApplicationKey, APP_ID_HEADER_KEY: 123 },
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
})
