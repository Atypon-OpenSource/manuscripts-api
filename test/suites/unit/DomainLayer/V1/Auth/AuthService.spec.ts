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
    }))
  }
})

import '../../../../../../test/utilities/configMock'
import '../../../../../../test/utilities/dbMock'
import {
  invalidCredentials,
  invalidPasswordCredentials,
  validCredentials,
  validEmailCredentials
} from '../../../../../data/fixtures/credentials'
import {
  validGoogleAccess,
  validGoogleAccessWithInvitationId
} from '../../../../../data/fixtures/googleAccess'
import { defaultSystemUser } from '../../../../../data/fixtures/user'
import {
  InvalidCredentialsError,
  NoTokenError,
  ValidationError,
  MissingUserStatusError,
  UserBlockedError,
  UserNotVerifiedError,
  EmailServiceError,
  AccountNotFoundError,
  InvalidPasswordError,
  DuplicateEmailError,
  InvalidBackchannelLogoutError,
  MissingUserRecordError
} from '../../../../../../src/Errors'
import {
  userWithValidCredentials,
  validUserToken,
  validJWTToken,
  invalidUserJWTToken,
  validUserStatus
} from '../../../../../data/fixtures/authServiceUser'
import {
  userRowData,
  userSocialRowData
} from '../../../../../data/fixtures/userRowData'
import { SingleUseTokenType } from '../../../../../../src/Models/SingleUseTokenModels'

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { UserActivityEventType } from '../../../../../../src/Models/UserEventModels'
import {
  MAX_NUMBER_OF_LOGIN_ATTEMPTS,
  AuthService
} from '../../../../../../src/DomainServices/Auth/AuthService'

import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { validLogoutToken } from '../../../../../data/fixtures/logoutTokens'
import { ServerToServerAuthCredentials } from '../../../../../../src/Models/UserModels'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'
jest.setTimeout(TEST_TIMEOUT)

const chance = new Chance()
beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init(true)
})

describe('AuthService - Login', () => {
  test('should fail if email does not exist', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(null)
    }

    return expect(authService.login(invalidCredentials)).rejects.toThrowError(
      AccountNotFoundError
    )
  })

  test("should fail if user status doesn't exists", () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: async () => Promise.resolve(userWithValidCredentials)
    }
    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(null)
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    return expect(
      authService.login(invalidPasswordCredentials)
    ).rejects.toThrowError(MissingUserStatusError)
  })

  test('should fail if user is blocked', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: async () => Promise.resolve(userWithValidCredentials)
    }
    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          blockUntil: new Date().getTime() + 2000,
          isVerified: true
        })
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    return expect(
      authService.login(invalidPasswordCredentials)
    ).rejects.toThrowError(UserBlockedError)
  })

  test('should fail if password is wrong and block user', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: async () => Promise.resolve(userWithValidCredentials)
    }
    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          isBlocked: true,
          blockUntil: new Date().getTime() - 5000,
          password: '123',
          isVerified: true
        }),
      failedLoginCount: async () =>
        Promise.resolve(MAX_NUMBER_OF_LOGIN_ATTEMPTS),
      patch: async () => Promise.resolve(),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    return expect(
      authService.login(invalidPasswordCredentials)
    ).rejects.toThrowError(InvalidPasswordError)
  })

  test('should fail if password is wrong', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(userWithValidCredentials)
    }
    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          blockUntil: new Date().getTime() - 5000,
          password: '123',
          isVerified: true
        }),
      failedLoginCount: async () => Promise.resolve(0),
      patch: async () => Promise.resolve(),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    return expect(
      authService.login(invalidPasswordCredentials)
    ).rejects.toThrowError(InvalidPasswordError)
  })

  test('should fail if user is not verified', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(userWithValidCredentials)
    }
    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          isBlocked: false,
          blockUntil: null,
          password: 'the-password',
          isVerified: false
        }),
      failedLoginCount: async () =>
        Promise.resolve(MAX_NUMBER_OF_LOGIN_ATTEMPTS),
      patch: async () => Promise.resolve()
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    return expect(authService.login(validCredentials)).rejects.toThrowError(
      UserNotVerifiedError
    )
  })

  test('should log user in and generates new user token', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(userWithValidCredentials)
    }
    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      failedLoginCount: async () => Promise.resolve(0),
      patch: async () => Promise.resolve(),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }
    authService.userTokenRepository = {
      getOne: async () => Promise.resolve(null),
      create: async () => Promise.resolve(null),
      touch: async () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `User|${id}`
    }

    authService.userProfileRepository = {
      getById: async () => Promise.resolve({})
    }

    const user = await authService.login(validCredentials)

    expect(user.token).toBeDefined()
    delete user.token

    expect(user).toMatchSnapshot()
  })

  test('should log user in and updates existing token', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(userWithValidCredentials)
    }

    authService.userTokenRepository = {
      getOne: () => Promise.resolve(validUserToken),
      create: () => Promise.resolve(null),
      patch: () => Promise.resolve(null),
      touch: () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `User|${id}`
    }
    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      failedLoginCount: async () => Promise.resolve(0),
      patch: async () => Promise.resolve(),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    authService.userProfileRepository = {
      getById: async () => Promise.resolve({})
    }

    const user = await authService.login(validCredentials)

    expect(user.token).toBeDefined()

    delete user.token
    expect(user).toMatchSnapshot()
  })
})

describe('AuthService - serverToServerAuth', () => {
  test('should fail if user does not exists', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(null)
    }

    return expect(
      authService.serverToServerAuth({
        email: chance.email(),
        appId: chance.guid(),
        deviceId: chance.guid()
      })
    ).rejects.toThrowError(AccountNotFoundError)
  })
})

describe('AuthService - loginGoogle', () => {
  test('should log user in and return jwt token if user already exist', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: () => Promise.resolve(defaultSystemUser)
    }

    authService.userTokenRepository = {
      getOne: () => Promise.resolve(null),
      create: () => Promise.resolve(null),
      touch: () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `User|${id}`
    }

    authService.userStatusRepository = {
      create: async () => Promise.resolve(null),
      statusForUserId: async () => Promise.resolve({}),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    authService.userProfileRepository = {
      getById: async () => Promise.resolve({})
    }

    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    const user = await authService.loginGoogle(validGoogleAccess)
    expect(user.token).toBeDefined()

    delete user.token
    expect(user).toMatchSnapshot()
  })

  test('should log user in and return jwt token if user not exist', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.invitationService = {
      accept: jest.fn(() => Promise.resolve())
    }

    authService.userRepository = {
      getOne: () => Promise.resolve(null),
      create: () => Promise.resolve(defaultSystemUser)
    }

    authService.userEmailRepository = {
      create: () => Promise.resolve()
    }

    authService.userTokenRepository = {
      getOne: async () => Promise.resolve(null),
      create: async () => Promise.resolve(null),
      touch: async () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `User|${id}`
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    authService.syncService = {
      getOrCreateUserStatus: async () => Promise.resolve({}),
      createUserProfile: jest.fn()
    }

    authService.userProfileRepository = {
      getById: async () => Promise.resolve({})
    }

    const user = await authService.loginGoogle(validGoogleAccess)

    expect(user.token).toBeDefined()

    delete user.token
    expect(user).toMatchSnapshot()

    const user2 = await authService.loginGoogle(
      validGoogleAccessWithInvitationId
    )

    expect(user2.token).toBeDefined()

    delete user2.token
    expect(user2).toMatchSnapshot()
  })

  test('should fail to create user with duplicate email', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.invitationService = {
      accept: jest.fn(() => Promise.resolve())
    }

    authService.userRepository = {
      getOne: () => Promise.resolve(null),
      create: () => Promise.resolve(defaultSystemUser)
    }

    authService.userEmailRepository = {
      create: () => Promise.reject(new Error())
    }

    authService.userTokenRepository = {
      getOne: async () => Promise.resolve(null),
      create: async () => Promise.resolve(null),
      touch: async () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `User|${id}`
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }
    authService.userStatusRepository = {
      create: async () => Promise.resolve({})
    }

    return expect(
      authService.loginGoogle(validGoogleAccess)
    ).rejects.toThrowError(DuplicateEmailError)
  })
})


describe('AuthService - logout', () => {
  test('should fail if the token is invalid', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = { getById: () => Promise.resolve(undefined) }
    authService.userTokenRepository = { getById: () => Promise.resolve(null) }

    return expect(authService.logout('foobar')).rejects.toThrowError(
      InvalidCredentialsError
    )
  })


  test('should fail if there is no token in DB', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userTokenRepository = {
      fullyQualifiedId: (id: string) => `UserToken|${id}`,
      getById: () => Promise.resolve(null)
    }
    return expect(authService.logout(invalidUserJWTToken)).rejects.toThrowError(
      NoTokenError
    )
  })

  test('should fail if user status is not in the db', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getById: () => Promise.resolve(defaultSystemUser)
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    authService.userTokenRepository = {
      fullyQualifiedId: (id: string) => `UserToken|${id}`,
      getById: () => Promise.resolve(validUserToken),
      remove: jest.fn(() => {
        return Promise.resolve(null)
      })
    }

    authService.userStatusRepository = {
      statusForUserId: () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    return expect(authService.logout(validJWTToken)).rejects.toThrowError()
  })
})

describe('AuthService - sendPasswordResetInstructions', () => {
  test('should fail if email does not exist', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = { getOne: () => Promise.resolve(null) }

    return expect(
      authService.sendPasswordResetInstructions(invalidCredentials.email)
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if user status does not exist', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getOne: async () =>
        Promise.resolve({
          _id: '1',
          name: 'Abdallah',
          email: 'abarmawi@live.com',
          password:
            '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
          isVerified: true,
          createdAt: 1518357671676
        })
    }
    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(null)
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    return expect(
      authService.sendPasswordResetInstructions(invalidCredentials.email)
    ).rejects.toThrowError()
  })

  test('should send reset password and save token if the email is valid and token does not exist in db.', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    const ensureTokenExists: any =
      DIContainer.sharedContainer.singleUseTokenRepository.ensureTokenExists
    const rawData = {
      _id: '1',
      name: 'Abdallah',
      email: 'abarmawi@live.com',
      password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
      isVerified: true,
      createdAt: 1518357671676
    }

    authService.userRepository = { getOne: () => Promise.resolve(rawData) }
    authService.emailService = {
      sendAccountVerification: jest.fn(() => Promise.resolve(true)),
      sendPasswordResetInstructions: jest.fn(() => Promise.resolve(true))
    }
    authService.userRepository = {
      getOne: () => Promise.resolve(rawData)
    }
    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(validUserStatus),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    authService.singleUseTokenRepository = {
      getOne: () => Promise.resolve(null),
      create: jest.fn(() => Promise.resolve({ _id: 'foo' })),
      ensureTokenExists: ensureTokenExists,
      fullyQualifiedId: (id: string) => `SingleUseToken|${id}`
    }

    await authService.sendPasswordResetInstructions(validEmailCredentials.email)
    expect(authService.emailService.sendPasswordResetInstructions).toBeCalled()
    expect(authService.singleUseTokenRepository.create).toBeCalled()
  })

  test('should send reset password and update token if the email is valid and token exist in db.', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    const ensureTokenExists: any =
      DIContainer.sharedContainer.singleUseTokenRepository.ensureTokenExists

    authService.userRepository = {
      getOne: () =>
        Promise.resolve({
          _id: '1',
          name: 'Abdallah',
          email: 'abarmawi@live.com',
          password:
            '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
          isVerified: true,
          createdAt: 1518357671676
        })
    }

    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          password: '12345-hash'
        }),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }
    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }
    authService.emailService = {
      sendPasswordResetInstructions: jest.fn(() => Promise.resolve(true))
    }

    const token = {
      _id: 'foo',
      userId: 'bar',
      tokenType: SingleUseTokenType.ResetPasswordToken,
      createdAt: new Date(1900, 1, 1).getTime(),
      updatedAt: new Date().getTime()
    }
    authService.singleUseTokenRepository = {
      getOne: () => Promise.resolve(token),
      patch: jest.fn(),
      ensureTokenExists: ensureTokenExists,
      fullyQualifiedId: (id: string) => `SingleUseToken|${id}`
    }

    await authService.sendPasswordResetInstructions(validEmailCredentials.email)

    expect(authService.emailService.sendPasswordResetInstructions).toBeCalled()
    expect(authService.singleUseTokenRepository.patch).toBeCalled()
  })

  test('should send login with google and save token if the email is valid and token does not exist in db.', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    const ensureTokenExists: any =
      DIContainer.sharedContainer.singleUseTokenRepository.ensureTokenExists

    authService.userRepository = {
      getOne: () => Promise.resolve(userSocialRowData)
    }

    authService.emailService = {
      sendPasswordResetInstructions: jest.fn(() => Promise.resolve(true))
    }

    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }
    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve({}),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    authService.singleUseTokenRepository = {
      getOne: () => Promise.resolve(null),
      create: jest.fn(() => Promise.resolve({ _id: 'foo' })),
      ensureTokenExists: ensureTokenExists
    }

    await authService.sendPasswordResetInstructions(validEmailCredentials.email)
    expect(authService.emailService.sendPasswordResetInstructions).toBeCalled()
    expect(authService.singleUseTokenRepository.create).toBeCalled()
  })

  test('should send login with google and update token if the email is valid and token exist in db.', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    const ensureTokenExists: any =
      DIContainer.sharedContainer.singleUseTokenRepository.ensureTokenExists

    const rawData = {
      _id: '1',
      name: 'Abdallah',
      email: 'abarmawi@gmail.com',
      isVerified: true,
      createdAt: 1518357671676
    }
    authService.userRepository = { getOne: () => Promise.resolve(rawData) }
    authService.userRepository = {
      getOne: () => Promise.resolve(rawData)
    }
    authService.emailService = {
      sendPasswordResetInstructions: jest.fn(() => Promise.resolve(true))
    }

    authService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }
    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve({}),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    const token = {
      _id: 'foo',
      userId: 'bar',
      tokenType: SingleUseTokenType.ResetPasswordToken,
      createdAt: new Date(1900, 1, 1).getTime(),
      updatedAt: new Date().getTime()
    }
    authService.singleUseTokenRepository = {
      getOne: () => Promise.resolve(token),
      patch: jest.fn(),
      ensureTokenExists: ensureTokenExists
    }
    await authService.sendPasswordResetInstructions(validEmailCredentials.email)
    expect(authService.emailService.sendPasswordResetInstructions).toBeCalled()
    expect(authService.singleUseTokenRepository.patch).toBeCalled()
  })

  test('should fail to send email, because an error occurred in emailService sendPasswordResetInstructions method', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    const ensureTokenExists: any =
      DIContainer.sharedContainer.singleUseTokenRepository.ensureTokenExists

    authService.userRepository = { getOne: () => Promise.resolve(userRowData) }
    authService.emailService = {
      sendPasswordResetInstructions: () =>
        Promise.reject(
          new EmailServiceError(
            'an error happened in sendPasswordResetInstructions',
            null
          )
        )
    }

    authService.singleUseTokenRepository = {
      getOne: () => Promise.resolve(null),
      create: jest.fn(() => Promise.resolve({ _id: 'foo' })),
      ensureTokenExists: ensureTokenExists,
      fullyQualifiedId: (id: string) => `SingleUseToken|${id}`
    }
    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          password: '12345-hash'
        }),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    return expect(
      authService.sendPasswordResetInstructions(validEmailCredentials.email)
    ).rejects.toThrowError(EmailServiceError)
  })
})

describe('AuthService - resetPassword', () => {
  test('should fail if reset password credentials is null', () => {
    const authService = DIContainer.sharedContainer.authService

    return expect(authService.resetPassword(null as any)).rejects.toThrowError(
      InvalidCredentialsError
    )
  })
  test('should fail if the token is not in the db', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.singleUseTokenRepository = {
      getById: async () => null
    }
    authService.userStatusRepository = {
      patch: jest.fn()
    }

    const resetPasswordCredentials = {
      tokenId: 'not-in-db',
      password: '54321',
      deviceId: '9f338224-b0d5-45aa-b02c-21c7e0c3c07b'
    }
    return expect(
      authService.resetPassword(resetPasswordCredentials)
    ).rejects.toThrowError(NoTokenError)
  })

  test('should fail if the user is not in the db', () => {
    const authService: any = DIContainer.sharedContainer.authService
    const resetPasswordCredentials: any = {
      token: chance.hash(),
      password: '54321',
      deviceId: '9f338224-b0d5-45aa-b02c-21c7e0c3c07b'
    }
    const token = {
      _id: 'foo',
      userId: 'bar',
      tokenType: SingleUseTokenType.ResetPasswordToken,
      createdAt: new Date(1900, 1, 1).getTime(),
      updatedAt: new Date().getTime()
    }
    authService.singleUseTokenRepository = {
      getById: () => Promise.resolve(token)
    }
    authService.userRepository = {
      getById: () => Promise.resolve(null)
    }

    expect.assertions(1)
    return expect(
      authService.resetPassword(resetPasswordCredentials)
    ).rejects.toThrowError(MissingUserRecordError)
  })

  test('should reset the password', () => {
    const authService: any = DIContainer.sharedContainer.authService
    const token = {
      _id: 'foo',
      userId: 'User|bar',
      tokenType: SingleUseTokenType.ResetPasswordToken,
      createdAt: new Date(1900, 1, 1).getTime(),
      updatedAt: new Date().getTime()
    }

    const resetPasswordCredentials: any = {
      token: token._id,
      newPassword: '54321',
      deviceId: '9f338224-b0d5-45aa-b02c-21c7e0c3c07b'
    }

    authService.userRepository = {
      getById: () => Promise.resolve(defaultSystemUser)
    }

    authService.userStatusRepository = {
      patchStatusWithUserId: jest.fn(() => Promise.resolve(defaultSystemUser)),
      fullyQualifiedId: jest.fn((id: string) => `UserStatus|${id}`)
    }

    authService.singleUseTokenRepository = {
      getById: () => Promise.resolve(token),
      patch: jest.fn(),
      create: jest.fn(),
      remove: jest.fn()
    }

    authService.userTokenRepository = {
      remove: jest.fn(),
      getOne: () => Promise.resolve(defaultSystemUser)
    }

    authService.userProfileRepository = {
      getById: async () => Promise.resolve({})
    }

    authService.emailService = {
      sendPasswordResetInstructions: jest.fn(() => Promise.resolve())
    }

    return authService.resetPassword(resetPasswordCredentials).then(() => {
      expect(authService.singleUseTokenRepository.remove).toBeCalled()
      expect(authService.userTokenRepository.remove).toBeCalled()
      expect(
        authService.userStatusRepository.patchStatusWithUserId
      ).toBeCalled()
    })
  })
})

describe('AuthService - createEvent', () => {
  test('should fail if error occurred', () => {
    const activityTrackingService: any =
      DIContainer.sharedContainer.activityTrackingService
    activityTrackingService.userEventRepository = {
      create: function () {
        return new Promise((_resolve, reject) =>
          reject(new Error('User tracking derp'))
        )
      }
    }

    return expect(
      activityTrackingService.createEvent(
        '123',
        UserActivityEventType.EmailVerified,
        null,
        null
      )
    ).rejects.toThrow()
  })

  test('should create event successfully', async () => {
    const activityTrackingService: any =
      DIContainer.sharedContainer.activityTrackingService
    activityTrackingService.userEventRepository = {
      create: () => {
        return new Promise((resolve, _reject) =>
          resolve({
            userId: '123',
            userActivity: UserActivityEventType.EmailVerified,
            appId: null,
            deviceId: null
          })
        )
      }
    }

    await activityTrackingService.awaitCreation()

    const activity = await activityTrackingService.createEvent(
      '123',
      UserActivityEventType.EmailVerified,
      null,
      null
    )

    expect(activity).toEqual({
      userId: '123',
      userActivity: UserActivityEventType.EmailVerified,
      appId: null,
      deviceId: null
    })
  })
})

describe('AuthService - changePassword', () => {
  test('should fail if user not found', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      authService.changePassword({ userId: 'foo' })
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if user status not found', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getById: async () => Promise.resolve({ _id: 'foo' })
    }

    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(null)
    }
    return expect(
      authService.changePassword({ userId: 'foo' })
    ).rejects.toThrowError(MissingUserStatusError)
  })

  test('should fail if password does not match', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getById: async () => Promise.resolve({ _id: 'foo' })
    }

    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve({ password: '123' })
    }

    await expect(
      authService.changePassword({ userId: 'foo', currentPassword: '1234' })
    ).rejects.toThrowError(InvalidPasswordError)
  })

  test('should change user password and delete sync sessions, token for all the other devices', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userRepository = {
      getById: async () => Promise.resolve({ _id: 'foo' })
    }

    authService.userStatusRepository = {
      statusForUserId: async () =>
        Promise.resolve({
          password:
            '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
          deviceSessions: { dev1: 's1', dev2: 's2' }
        }),
      patchStatusWithUserId: async () => Promise.resolve({})
    }

    authService.userTokenRepository = {
      remove: jest.fn()
    }

    await authService.changePassword({
      userId: 'foo',
      currentPassword: '12345',
      newPassword: '123',
      deviceId: 'bar'
    })
    expect(authService.userTokenRepository.remove).toBeCalled()
  })
})

describe('AuthService - ensureUserStatusExists', () => {
  test('should call getOrCreateUserStatus if gateway account does not exists', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    authService.syncService = {
      getOrCreateUserStatus: jest.fn()
    }
    await authService.ensureUserStatusExists('userId')
    expect(authService.syncService.getOrCreateUserStatus).toBeCalled()
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
    return expect(() =>
      AuthService.ensureValidAuthorizationBearer('foo')
    ).toThrowError(ValidationError)
  })

  test('should fail if the value is loginTokenPayload', () => {
    return expect(() =>
      AuthService.ensureValidAuthorizationBearer('Bearer foo')
    ).toThrowError(InvalidCredentialsError)
  })

  test('should fail if the value is loginTokenPayload', () => {
    return expect(() =>
      AuthService.ensureValidAuthorizationBearer(`Bearer ${validJWTToken}`)
    ).not.toThrowError()
  })
})

describe('AuthService - iamOAuthCallback', () => {
  test('should fail if connectUserID is missing', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    const payload = {}
    const state = {
      deviceId: 'devoceId'
    }

    await expect(
      authService.iamOAuthCallback(payload, state)
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should fail if deviceId is missing', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    const payload = {
      email: 'foo@bar.com',
      sub: chance.guid()
    }

    const state = {}

    authService.userRepository = {
      getOne: async () => Promise.resolve({})
    }

    await expect(
      authService.iamOAuthCallback(payload, state)
    ).rejects.toThrowError(ValidationError)
  })

  test('should create user status if missing', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    const payload = {
      email: 'foo@bar.com',
      aud: 'app-id',
      sub: chance.guid()
    }

    const state = {
      deviceId: 'deviceId'
    }

    authService.userRepository = {
      getOne: async () => Promise.resolve({ _id: 'User|foobarovic' }),
      create: async () =>
        Promise.resolve({
          _id: 'User|foobarovic'
        })
    }

    authService.userProfileRepository = {
      getById: () => Promise.resolve({})
    }

    authService.syncService = {
      getOrCreateUserStatus: async () =>
      Promise.resolve({
        _id: 'User|foobarovic',
        email: 'foo@bar.com'
      }),
      createUserProfile: jest.fn(),
      createGatewaySessions: async () => Promise.resolve('session')
    }

    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(null)
    }

    authService.activityTrackingService = {
      createEvent: jest.fn()
    }

    authService.userTokenRepository = {
      getOne: async () =>
        Promise.resolve({
          token: 'foobar'
        })
    }

    const x = await authService.iamOAuthCallback(payload, state)
    expect(x).toEqual({ token: 'foobar', user: { _id: 'User|foobarovic' } })
  })

  test('should fail if user status of the new user is missing', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    const payload = {
      email: 'foo@bar.com',
      aud: 'app-id',
      sub: chance.guid()
    }

    const state = {
      deviceId: 'deviceId'
    }

    authService.userRepository = {
      getOne: async () => Promise.resolve(null),
      create: async () => Promise.resolve({ _id: 'User|someone' })
    }

    authService.userEmailRepository = {
      create: async () => Promise.resolve()
    }

    authService.syncService = {
      getOrCreateUserStatus: jest.fn(),
      createUserProfile: jest.fn(),
      createGatewaySessions: async () => Promise.resolve('session')
    }

    authService.userStatusRepository = {
      create: async () => Promise.resolve(null)
    }

    authService.activityTrackingService = {
      createEvent: jest.fn()
    }

    authService.userTokenRepository = {
      getOne: async () =>
        Promise.resolve({
          token: 'foobar'
        })
    }

    await expect(
      authService.iamOAuthCallback(payload, state)
    ).rejects.toThrowError(MissingUserStatusError)
  })

  test('should fail if email is already used', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    const payload = {
      email: 'foo@bar.com',
      aud: 'app-id',
      sub: chance.guid()
    }

    const state = {
      deviceId: 'deviceId'
    }

    authService.userEmailRepository = {
      create: async () => Promise.reject(new Error())
    }

    authService.userRepository = {
      getOne: async () => Promise.resolve(null),
      create: async () => Promise.resolve({})
    }

    authService.syncService = {
      getOrCreateUserStatus: jest.fn(),
      createUserProfile: jest.fn(),
      createGatewaySessions: async () => Promise.resolve('session')
    }

    authService.userStatusRepository = {
      create: async () =>
        Promise.resolve({
          _id: 'User|foobarovic',
          email: 'foo@bar.com'
        })
    }

    authService.activityTrackingService = {
      createEvent: jest.fn()
    }

    authService.userTokenRepository = {
      getOne: async () =>
        Promise.resolve({
          token: 'foobar'
        })
    }

    await expect(
      authService.iamOAuthCallback(payload, state)
    ).rejects.toThrowError(DuplicateEmailError)
  })

  test('should get and log in the user', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    const payload = {
      email: 'foo@bar.com',
      aud: 'app-id',
      sub: chance.guid()
    }

    const state = {
      deviceId: 'deviceId'
    }

    authService.userRepository = {
      getOne: async () => Promise.resolve({ _id: 'User|foobarovic' }),
      create: async () =>
        Promise.resolve({
          _id: 'User|foobarovic'
        }),
      patch: async () => Promise.resolve({})
    }

    authService.syncService = {
      getOrCreateUserStatus: jest.fn(),
      createUserProfile: jest.fn(),
      createGatewaySessions: async () => Promise.resolve('session')
    }

    authService.userProfileRepository = {
      getById: () => Promise.resolve({})
    }

    authService.invitationService = {
      updateInvitedUserID: jest.fn()
    }

    authService.containerInvitationService = {
      updateInvitedUserID: jest.fn()
    }

    authService.userStatusRepository = {
      create: async () =>
        Promise.resolve({
          _id: 'User|foobarovic',
          email: 'foo@bar.com'
        }),
      statusForUserId: async () => Promise.resolve({})
    }

    authService.activityTrackingService = {
      createEvent: jest.fn()
    }

    authService.userTokenRepository = {
      getOne: async () =>
        Promise.resolve({
          token: 'foobar',
          userId: 'User|foobarovic'
        })
    }

    const x = await authService.iamOAuthCallback(payload, state)
    expect(x).toEqual({ token: 'foobar', user: { _id: 'User|foobarovic' } })
  })

  test('should create and log in the user', async () => {
    const authService: any = DIContainer.sharedContainer.authService

    const payload = {
      email: 'foo@bar.com',
      aud: 'app-id',
      sub: chance.guid()
    }

    const state = {
      deviceId: 'deviceId'
    }

    authService.userEmailRepository = {
      create: async () => Promise.resolve()
    }

    authService.userRepository = {
      getOne: async () => Promise.resolve(null),
      create: async () => Promise.resolve({ _id: 'User|someone' })
    }

    authService.syncService = {
      getOrCreateUserStatus: async () => Promise.resolve({
        _id: 'User|foobarovic',
        email: 'foo@bar.com'
      }),
      createUserProfile: jest.fn(),
      createGatewaySessions: async () => Promise.resolve('session')
    }

    authService.activityTrackingService = {
      createEvent: jest.fn()
    }

    authService.userTokenRepository = {
      getOne: async () =>
        Promise.resolve({
          token: 'foobar'
        })
    }

    authService.userProfileRepository = {
      getById: () => Promise.resolve({})
    }

    const x = await authService.iamOAuthCallback(payload, state)
    expect(x).toEqual({
      token: 'foobar',
      user: { _id: 'User|someone' }
    })
  })
})

describe('AuthService - backchannelLogout', () => {
  test('should fail if user token does not exist', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userTokenRepository = {
      getOne: async () => Promise.resolve(null)
    }

    return expect(
      authService.backchannelLogout(validLogoutToken)
    ).rejects.toThrowError(InvalidBackchannelLogoutError)
  })

  test('should fail if user status does not exist', () => {
    const authService: any = DIContainer.sharedContainer.authService

    authService.userTokenRepository = {
      getOne: async () => Promise.resolve(validUserToken),
      remove: async () => jest.fn()
    }

    authService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(null)
    }

    return expect(
      authService.backchannelLogout(validLogoutToken)
    ).rejects.toThrowError(InvalidBackchannelLogoutError)
  })
})

describe('AuthService - serverToServerTokenAuth', () => {
  test('should fail if user not found', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    authService.createUserSessionAndToken = jest.fn()
    const credentials: ServerToServerAuthCredentials = {
      appId: 'app-id',
      connectUserID: 'invalid-connectId',
      deviceId: 'valid-deviceId'
    }
    await expect(authService.serverToServerTokenAuth(credentials)).rejects.toThrow(AccountNotFoundError)
  })

  test('should call createUserSessionAndToken', async () => {
    const authService: any = DIContainer.sharedContainer.authService
    authService.userRepository.getOne = jest.fn(() => validBody)
    authService.createUserSessionAndToken = jest.fn()
    const credentials: ServerToServerAuthCredentials = {
      appId: 'app-id',
      connectUserID: 'invalid-connectId',
      deviceId: 'valid-deviceId'
    }
    await authService.serverToServerTokenAuth(credentials)
    expect(authService.createUserSessionAndToken).toBeCalled()
  })
})
