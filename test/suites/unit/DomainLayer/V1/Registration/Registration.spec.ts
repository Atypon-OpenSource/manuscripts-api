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
jest.mock('../../../../../../src/DomainServices/Sync/SyncService', () => {
  return {
    GATEWAY_BUCKETS: [ 'data', 'shared' ],
    SyncService: jest.fn(() => ({
      createGatewayAccount: jest.fn(),
      createGatewayContributor: jest.fn(),
      createGatewayAdministrator: jest.fn()
    }))
  }
})

jest.mock('email-templates', () => jest.fn().mockImplementation(() => {
  return {
    send: jest.fn(() => Promise.resolve({})),
    render: jest.fn(() => Promise.resolve({}))
  }
}))

jest.mock('../../../../../../src/DomainServices/External/AWS', () => ({
  SES: { sendEmail: jest.fn((_foo, callback) => callback(null, { foo: 1 })) }
}))

import { userList } from '../../../../../data/dump/user'
import {
  ConflictingRecordError,
  NoTokenError,
  MissingUserStatusError,
  ValidationError,
  InvalidCredentialsError,
  ConflictingUnverifiedUserExistsError,
  InvalidServerCredentialsError,
  MissingUserRecordError,
  DuplicateEmailError
} from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { SingleUseTokenType } from '../../../../../../src/Models/SingleUseTokenModels'
import { userSignupList } from '../../../../../data/fixtures/signupCredentials'
import { UserActivityEventType } from '../../../../../../src/Models/UserEventModels'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { ConnectSignupCredentials } from '../../../../../../src/Models/UserModels'
import Chance from 'chance'
import { validBody } from '../../../../../data/fixtures/credentialsRequestPayload'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init(true)
})

describe('Registration - Signup', () => {
  test('should fail if a no properly signed token is given', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService

    const credentials = {
      name: 'Valid System User',
      email: 'valid-user@manuscriptsapp.com',
      token: 'not-valid-token'
    }

    return expect(
        userRegistrationService.signup(credentials)
    ).rejects.toThrowError(InvalidServerCredentialsError)
  })

  test('should fail if user status does not exist', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
    userRegistrationService.userRepository = {
      getOne: async () => Promise.resolve(userList[0])
    }
    userRegistrationService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(null),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    return expect(
      userRegistrationService.signup(userList[0])
    ).rejects.toThrowError(MissingUserStatusError)
  })

  test('should fail if verified user already exist', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
    userRegistrationService.userRepository = {
      getOne: async () => Promise.resolve(userList[0])
    }
    const userStatus = {
      _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
      password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
      isVerified: true,
      createdAt: new Date(1518357671676),
      blockUntil: null
    }
    userRegistrationService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(userStatus),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    return expect(
      userRegistrationService.signup(userList[0])
    ).rejects.toThrowError(ConflictingRecordError)
  })

  test('should fail if not verified user already exist', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
    userRegistrationService.userRepository = {
      getOne: async () => Promise.resolve(userList[3])
    }

    const userStatus = {
      _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
      password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
      isVerified: false,
      createdAt: new Date(1518357671676),
      blockUntil: null
    }
    userRegistrationService.userStatusRepository = {
      statusForUserId: async () => Promise.resolve(userStatus),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }
    return expect(
      userRegistrationService.signup(userList[3])
    ).rejects.toThrowError(ConflictingUnverifiedUserExistsError)
  })

  test('should send email if user not exist and verifyEmailToken does not exist in db', async () => {
    const userRegistrationService: any =
      DIContainer.sharedContainer.userRegistrationService

    const ensureTokenExists: any =
      DIContainer.sharedContainer.singleUseTokenRepository.ensureTokenExists

    userRegistrationService.userRepository = {
      getOne: async () => Promise.resolve(null),
      create: async () => Promise.resolve(userList[1])
    }

    userRegistrationService.userEmailRepository = {
      create: () => Promise.resolve()
    }

    userRegistrationService.emailService = {
      sendAccountVerification: jest.fn()
    }

    userRegistrationService.singleUseTokenRepository = {
      getOne: async () => Promise.resolve(null),
      create: jest.fn(() => Promise.resolve({ _id: 'foo' })),
      ensureTokenExists: ensureTokenExists,
      fullyQualifiedId: (id: string) => `SingleUseToken|${id}`
    }

    userRegistrationService.userStatusRepository = {
      create: async () => Promise.resolve(null)
    }

    userRegistrationService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    await userRegistrationService.signup(userSignupList[2])

    expect(
      userRegistrationService.emailService.sendAccountVerification
    ).toBeCalled()

    expect(
      userRegistrationService.singleUseTokenRepository.create
    ).toBeCalled()
  })

  test('should send email if user not exist and verifyEmailToken exist in db', async () => {
    const userRegistrationService: any =
      DIContainer.sharedContainer.userRegistrationService

    const ensureTokenExists: any =
      DIContainer.sharedContainer.singleUseTokenRepository.ensureTokenExists

    userRegistrationService.userRepository = {
      getOne: async () => Promise.resolve(null),
      create: async () => Promise.resolve(userList[1])
    }

    userRegistrationService.userEmailRepository = {
      create: () => Promise.resolve()
    }

    userRegistrationService.emailService = {
      sendAccountVerification: jest.fn()
    }

    const token = {
      _id: 'foo',
      userId: 'bar',
      tokenType: SingleUseTokenType.VerifyEmailToken,
      createdAt: new Date(1900, 1, 1).getTime(),
      updatedAt: new Date().getTime()
    }

    userRegistrationService.singleUseTokenRepository = {
      getOne: () => Promise.resolve(token),
      patch: jest.fn(),
      ensureTokenExists: ensureTokenExists,
      fullyQualifiedId: (id: string) => `SingleUseToken|${id}`
    }

    userRegistrationService.userStatusRepository = {
      create: async () => Promise.resolve(null)
    }

    await userRegistrationService.signup(userSignupList[2])

    expect(userRegistrationService.singleUseTokenRepository.patch).toBeCalled()
    expect(
      userRegistrationService.emailService.sendAccountVerification
    ).toBeCalled()
  })

  test('should signup user without sending verification',async () => {
    const userRegistrationService: any =
      DIContainer.sharedContainer.userRegistrationService

    const ensureTokenExists: any =
      DIContainer.sharedContainer.singleUseTokenRepository.ensureTokenExists

    userRegistrationService.userRepository = {
      getOne: async () => Promise.resolve(null),
      create: async () => Promise.resolve(userList[1])
    }

    userRegistrationService.userEmailRepository = {
      create: () => Promise.resolve()
    }

    userRegistrationService.emailService = {
      sendAccountVerification: jest.fn()
    }

    userRegistrationService.singleUseTokenRepository = {
      getOne: async () => Promise.resolve(null),
      create: jest.fn(() => Promise.resolve({ _id: 'foo' })),
      ensureTokenExists: ensureTokenExists,
      fullyQualifiedId: (id: string) => `SingleUseToken|${id}`
    }

    userRegistrationService.userStatusRepository = {
      create: async () => Promise.resolve(null)
    }

    userRegistrationService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }

    const credentials = {
      name: 'Valid System User 5',
      email: 'valid-user-5@manuscriptsapp.com',
      password: 'a-hashed-password',
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.iyS3EfaK9Kqh2JUbp-nx9fh3YqLZHSGJOJBGX9uwc2Q'
    }

    await userRegistrationService.signup(credentials)

    expect(
      userRegistrationService.emailService.sendAccountVerification
    ).not.toBeCalled()
  })
})

describe('Registration - verify', () => {
  test('should fail if the token is not in the db', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService

    userRegistrationService.singleUseTokenRepository = {
      getById: async () => null
    }

    return expect(
      userRegistrationService.verify('not-in-db')
    ).rejects.toThrowError(NoTokenError)
  })

  test('should fail if the user is not in the db', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService

    const token = { _id: 'foo', userId: 'bar', tokenType: SingleUseTokenType.VerifyEmailToken, createdAt: new Date(1900, 1, 1).getTime(), updatedAt: new Date().getTime() }

    userRegistrationService.singleUseTokenRepository = {
      getById: () => Promise.resolve(token),
      remove: jest.fn()
    }

    userRegistrationService.userRepository = {
      getById: async () => null
    }

    return expect(
      userRegistrationService.verify('not-in-db')
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should verify user', async () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService

    const token = { _id: 'foo', userId: 'bar', tokenType: SingleUseTokenType.VerifyEmailToken, createdAt: new Date(1900, 1, 1).getTime(), updatedAt: new Date().getTime() }

    userRegistrationService.singleUseTokenRepository = {
      getById: () => Promise.resolve(token),
      remove: jest.fn()
    }
    userRegistrationService.userStatusRepository = {
      fullyQualifiedId: (id: string) => `UserStatus|${id}`,
      patchStatusWithUserId: jest.fn()
    }
    userRegistrationService.userEventRepository = {
      create: async () => Promise.resolve(null)
    }
    userRegistrationService.userRepository = {
      getById: async () => Promise.resolve({
        email: 'bar@foo.com'
      })
    }

    await userRegistrationService.verify(token._id)

    expect(userRegistrationService.singleUseTokenRepository.remove).toBeCalled()
    expect(userRegistrationService.userStatusRepository.patchStatusWithUserId).toBeCalled()
  })
})

describe('Registration - createEvent', () => {
  test('should fail if error occurred', () => {
    const activityTrackingService: any = DIContainer.sharedContainer.activityTrackingService
    activityTrackingService.userEventRepository = {
      create: () => {
        return new Promise((_resolve, reject) => reject(new Error('User tracking derp')))
      }
    }

    return expect(
      DIContainer.sharedContainer.activityTrackingService.createEvent(
        '123',
        UserActivityEventType.EmailVerified,
        null,
        null
      )
    ).rejects.toThrow()
  })
})

describe('Registration - requestVerificationEmail', () => {
  test('should fail if user not found', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService

    userRegistrationService.userRepository = {
      getOne: async () => null
    }

    return expect(userRegistrationService.requestVerificationEmail('foo@bar.com')).rejects.toThrowError(MissingUserRecordError)
  })

  test('should fail user status not found', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService

    userRegistrationService.userRepository = {
      getOne: async () => ({
        _id: 'User|foo@bar.com'
      })
    }

    userRegistrationService.userStatusRepository = {
      statusForUserId: async () => null,
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    return expect(
      userRegistrationService.requestVerificationEmail('foo@bar.com')
    ).rejects.toThrowError(MissingUserStatusError)
  })

  test('should fail if user already verified', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService

    userRegistrationService.userRepository = {
      getOne: async () => ({
        _id: 'User|foo@bar.com'
      })
    }

    userRegistrationService.userStatusRepository = {
      statusForUserId: async () => ({ isVerified: true }),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    return expect(
      userRegistrationService.requestVerificationEmail('foo@bar.com')
    ).rejects.toThrowError(ValidationError)
  })

  test('should send verification email', async () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService

    userRegistrationService.userRepository = {
      getOne: async () => ({
        _id: 'User|foo@bar.com'
      })
    }

    userRegistrationService.userStatusRepository = {
      statusForUserId: async () => ({ isVerified: false }),
      fullyQualifiedId: (id: string) => `UserStatus|${id}`
    }

    userRegistrationService.activityTrackingService.userEventRepository.create = jest.fn(() => Promise.resolve())
    userRegistrationService.sendAccountVerification = jest.fn()

    await userRegistrationService.requestVerificationEmail('foo@bar.com')

    expect(userRegistrationService.sendAccountVerification).toHaveBeenCalled()
    expect(userRegistrationService.activityTrackingService.userEventRepository.create).toHaveBeenCalled()

    /*const params: any[] = userRegistrationService.activityTrackingService.userEventRepository.create.mock.calls[0]

    expect(Object.keys(params[1])).toEqual(['expiry'])
    expect(params[1].expiry).toEqual(userRegistrationService.activityTrackingService.eventLifetime)*/
  })
})

describe('Registration - connectSignup', () => {

  test('should fail if user already exist', () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
    userRegistrationService.userRepository = {
      getOne: async () => Promise.resolve({ connectUserID: 'valid-connectId', ...userList[0] })
    }
    const chance = new Chance()
    const cred: ConnectSignupCredentials = {
      email: chance.email(),
      name: chance.string(),
      connectUserID: chance.string()
    }
    return expect(
        userRegistrationService.connectSignup(cred)
    ).rejects.toThrowError(DuplicateEmailError)
  })

  test('should create user', async () => {
    const userRegistrationService: any = DIContainer.sharedContainer.userRegistrationService
    userRegistrationService.userRepository = {
      getOne: async () => null,
      create: async () => validBody
    }
    userRegistrationService.userEmailRepository = {
      create: async () => validBody
    }

    userRegistrationService.syncService = {
      createGatewayAccount: async () => {},
      createGatewayContributor: async () => {}
    }

    userRegistrationService.activityTrackingService = {
      createEvent: async () => {}
    }

    userRegistrationService.userStatusRepository = {
      create: async () => Promise.resolve({})
    }

    const chance = new Chance()
    const cred: ConnectSignupCredentials = {
      email: chance.email(),
      name: chance.string(),
      connectUserID: chance.string()
    }
    return userRegistrationService.connectSignup(cred)
  })
})
