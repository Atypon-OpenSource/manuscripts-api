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

import '../../../../../../test/utilities/configMock'
import '../../../../../../test/utilities/dbMock'

import { describe } from 'jest-circus'

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  AuthService,
  MAX_NUMBER_OF_LOGIN_ATTEMPTS,
} from '../../../../../../src/DomainServices/Auth/AuthService'
import {
  AccountNotFoundError,
  InvalidCredentialsError,
  InvalidPasswordError,
  MissingUserStatusError,
  UserBlockedError,
  UserNotVerifiedError,
  ValidationError,
} from '../../../../../../src/Errors'
import { UserActivityEventType } from '../../../../../../src/Models/UserEventModels'
import { ServerToServerAuthCredentials } from '../../../../../../src/Models/UserModels'
import {
  userWithValidCredentials,
  validJWTToken,
  validUserStatus,
  validUserToken,
} from '../../../../../data/fixtures/authServiceUser'
import {
  invalidCredentials,
  invalidPasswordCredentials,
  validCredentials,
} from '../../../../../data/fixtures/credentials'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.mock('../../../../../../src/DomainServices/Sync/SyncService', () => {
  return {
    GATEWAY_BUCKETS: ['data', 'shared'],
    SyncService: jest.fn(() => ({
      createGatewaySessions: jest.fn(() => ['valid-sync-session']),
      getOrCreateUserStatus: jest.fn(),
      createUserProfile: jest.fn(),
      createGatewayAdministrator: jest.fn(),
      removeGatewaySessions: jest.fn(),
      removeAllGatewaySessions: jest.fn(),
    })),
  }
})

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init(true)
})

describe('AuthService - Login', () => {
  test('should fail if email does not exist', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(null),
    }

    return expect(authService.login(invalidCredentials)).rejects.toThrow(AccountNotFoundError)
  })

  test("should fail if user status doesn't exists", () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: async () => Promise.resolve(userWithValidCredentials),
    }
    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(null),
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null),
    }

    return expect(authService.login(invalidPasswordCredentials)).rejects.toThrow(
      MissingUserStatusError
    )
  })

  test('should fail if user is blocked', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: async () => Promise.resolve(userWithValidCredentials),
    }
    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          blockUntil: new Date().getTime() + 2000,
          isVerified: true,
        }),
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null),
    }

    return expect(authService.login(invalidPasswordCredentials)).rejects.toThrow(UserBlockedError)
  })

  test('should fail if password is wrong and block user', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: async () => Promise.resolve(userWithValidCredentials),
    }
    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          isBlocked: true,
          blockUntil: new Date().getTime() - 5000,
          password: '123',
          isVerified: true,
        }),
      failedLoginCount: async () => Promise.resolve(MAX_NUMBER_OF_LOGIN_ATTEMPTS),
      patch: async () => Promise.resolve(),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null),
    }

    return expect(authService.login(invalidPasswordCredentials)).rejects.toThrow(
      InvalidPasswordError
    )
  })

  test('should fail if password is wrong', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(userWithValidCredentials),
    }
    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          blockUntil: new Date().getTime() - 5000,
          password: '123',
          isVerified: true,
        }),
      failedLoginCount: async () => Promise.resolve(0),
      patch: async () => Promise.resolve(),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null),
    }

    return expect(authService.login(invalidPasswordCredentials)).rejects.toThrow(
      InvalidPasswordError
    )
  })

  test('should fail if user is not verified', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(userWithValidCredentials),
    }
    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          isBlocked: false,
          blockUntil: null,
          password: 'the-password',
          isVerified: false,
        }),
      failedLoginCount: async () => Promise.resolve(MAX_NUMBER_OF_LOGIN_ATTEMPTS),
      patch: async () => Promise.resolve(),
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null),
    }

    return expect(authService.login(validCredentials)).rejects.toThrow(UserNotVerifiedError)
  })

  test('should log user in and generates new user token', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(userWithValidCredentials),
    }
    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      failedLoginCount: async () => Promise.resolve(0),
      patch: async () => Promise.resolve(),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null),
    }
    authService.userTokenRepository = {
      getOne: async () => Promise.resolve(null),
      create: async () => Promise.resolve(null),
      touch: async () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `User|${id}`,
    }

    authService.userProfileRepository = {
      getById: async () => Promise.resolve({}),
    }

    const user = await authService.login(validCredentials)

    expect(user.token).toBeDefined()
    delete user.token

    expect(user).toMatchSnapshot()
  })

  test('should log user in and updates existing token', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(userWithValidCredentials),
    }

    authService.userTokenRepository = {
      getOne: () => Promise.resolve(validUserToken),
      create: () => Promise.resolve(null),
      patch: () => Promise.resolve(null),
      touch: () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `User|${id}`,
    }
    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      failedLoginCount: async () => Promise.resolve(0),
      patch: async () => Promise.resolve(),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null),
    }

    authService.userProfileRepository = {
      getById: async () => Promise.resolve({}),
    }

    const user = await authService.login(validCredentials)

    expect(user.token).toBeDefined()

    delete user.token
    expect(user).toMatchSnapshot()
  })
})

describe('AuthService - createEvent', () => {
  test('should fail if error occurred', () => {
    const activityTrackingService: any = DIContainer.sharedContainer.activityTrackingService
    activityTrackingService.userEventRepository = {
      create: function () {
        return new Promise((_resolve, reject) => reject(new Error('User tracking derp')))
      },
    }

    return expect(
      activityTrackingService.createEvent('123', UserActivityEventType.EmailVerified, null, null)
    ).rejects.toThrow()
  })

  test('should create event successfully', async () => {
    const activityTrackingService: any = DIContainer.sharedContainer.activityTrackingService
    activityTrackingService.userEventRepository = {
      create: () => {
        return new Promise((resolve, _reject) =>
          resolve({
            userId: '123',
            userActivity: UserActivityEventType.EmailVerified,
            deviceId: null,
          })
        )
      },
    }

    await activityTrackingService.awaitCreation()

    const activity = await activityTrackingService.createEvent(
      '123',
      UserActivityEventType.EmailVerified,
      null
    )

    expect(activity).toEqual({
      userId: '123',
      userActivity: UserActivityEventType.EmailVerified,
      deviceId: null,
    })
  })
})

describe('AuthService - ensureUserStatusExists', () => {
  test('should call getOrCreateUserStatus if gateway account does not exists', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    authService.syncService = {
      getOrCreateUserStatus: jest.fn(),
    }
    await authService.ensureUserStatusExists('userId')
    expect(authService.syncService.getOrCreateUserStatus).toHaveBeenCalled()
  })
})

describe('AuthService - isBearerHeaderValue', () => {
  test('should return false if the value is not a Bearer value', () => {
    expect(AuthService.isBearerHeaderValue('foo')).toBeFalsy()
  })

  test('should return false if the value is not a string', () => {
    expect(AuthService.isBearerHeaderValue(123 as any)).toBeFalsy()
  })

  test('should return true if the value is Bearer and string', () => {
    expect(AuthService.isBearerHeaderValue('Bearer foo')).toBeTruthy()
  })
})

describe('AuthService - ensureValidAuthorizationBearer', () => {
  test('should fail if the value is not Bearer', () => {
    return expect(() => AuthService.ensureValidAuthorizationBearer('foo')).toThrow(ValidationError)
  })

  test('should fail if the value is invalid', () => {
    return expect(() => AuthService.ensureValidAuthorizationBearer('Bearer foo')).toThrow(
      InvalidCredentialsError
    )
  })

  test('should pass if the value is loginTokenPayload', () => {
    return expect(() =>
      AuthService.ensureValidAuthorizationBearer(`Bearer ${validJWTToken}`)
    ).not.toThrow()
  })
})

describe('AuthService - serverToServerTokenAuth', () => {
  test('should fail if user not found', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    authService.createUserSessionAndToken = jest.fn()
    const credentials: ServerToServerAuthCredentials = {
      connectUserID: 'invalid-connectId',
      deviceId: 'valid-deviceId',
    }
    await expect(authService.serverToServerTokenAuth(credentials)).rejects.toThrow(
      AccountNotFoundError
    )
  })

  test('should call createUserSessionAndToken', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    authService.userRepository.getOne = jest.fn(() => validBody)
    authService.createUserSessionAndToken = jest.fn()
    const credentials: ServerToServerAuthCredentials = {
      connectUserID: 'invalid-connectId',
      deviceId: 'valid-deviceId',
    }
    await authService.serverToServerTokenAuth(credentials)
    expect(authService.createUserSessionAndToken).toHaveBeenCalled()
  })
})

describe('AuthService - createUserSessionAndToken', () => {
  test('should call createUserSessions', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    authService.ensureValidUserStatus = jest.fn()
    authService.createUserSessions = jest.fn(async () => {
      return { userToken: { token: 'token' } }
    })

    await authService.createUserSessionAndToken(validUser, 'deviceId', false, true)
    expect(authService.createUserSessions).toHaveBeenCalled()
  })
})
