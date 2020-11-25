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

import { drop, seed, testDatabase, dropBucket } from '../../../../../utilities/db'
import {
  InvalidCredentialsError,
  AccountNotFoundError
} from '../../../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import {
  validGoogleAccess,
  validGoogleAccessWithInvitationId
} from '../../../../../data/fixtures/googleAccess'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase()))
afterAll(() => db.bucket.disconnect())

describe('AuthService login', () => {
  const seedOptions: SeedOptions = { users: true, applications: true }

  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should fail if email is invalid', () => {
    const authService = DIContainer.sharedContainer.authService

    return expect(
      authService.login({
        email: 'invalid-email@example.com',
        password: '123456',
        deviceId: 'deviceId',
        appId: 'appId'
      })
    ).rejects.toThrowError(AccountNotFoundError)
  })

  test('should fail if password is invalid', () => {
    const authService = DIContainer.sharedContainer.authService

    return expect(
      authService.login({
        email: 'valid-user@manuscriptsapp.com',
        password: 'invalid pass',
        deviceId: 'deviceId',
        appId: 'appId'
      })
    ).rejects.toThrowError(InvalidCredentialsError)
  })

  test('should return authorized user', async () => {
    const authService = DIContainer.sharedContainer.authService

    const authorizedUser = await authService.login({
      email: 'valid-user@manuscriptsapp.com',
      password: '12345',
      deviceId: 'deviceId',
      appId: 'appId'
    })

    expect(authorizedUser.token).toBeDefined()
    expect(authorizedUser.user).toBeDefined()
    expect(await DIContainer.sharedContainer.syncService
                      .gatewayAccountExists(authorizedUser.user._id,
                                            BucketKey.DerivedData)).toEqual(true)

    delete (authorizedUser as any).token
    delete (authorizedUser as any).user._id
    delete (authorizedUser as any).syncSessions

    expect(authorizedUser).toMatchSnapshot()

    const anotherLoginAttempt = await authService.login({
      email: 'valid-user@manuscriptsapp.com',
      password: '12345',
      deviceId: 'deviceId',
      appId: 'appId'
    })

    expect(anotherLoginAttempt.token).toBeDefined()
    expect(anotherLoginAttempt.user).toBeDefined()
    expect(await DIContainer
            .sharedContainer
            .syncService
            .gatewayAccountExists(anotherLoginAttempt.user._id,
                                  BucketKey.DerivedData)).toEqual(true)
  })
})

describe('AuthService loginGoogle', () => {
  const seedOptions: SeedOptions = { users: true, invitations: true }
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should return authorized user', async () => {
    const authService = DIContainer.sharedContainer.authService
    const authorizedUser = await authService.loginGoogle(validGoogleAccess)
    const authorizedUser2 = await authService.loginGoogle(
      validGoogleAccessWithInvitationId
    )

    expect(authorizedUser.token).toBeDefined()
    expect(authorizedUser.user).toBeDefined()

    delete (authorizedUser as any).token
    delete (authorizedUser as any).user._id
    delete (authorizedUser as any).syncSessions

    expect(authorizedUser).toMatchSnapshot()

    expect(authorizedUser2.token).toBeDefined()
    expect(authorizedUser2.user).toBeDefined()

    delete (authorizedUser2 as any).token
    delete (authorizedUser2 as any).user._id
    delete (authorizedUser2 as any).syncSessions

    expect(authorizedUser2).toMatchSnapshot()
  })

  test('should return authorized user and update existing user token', async () => {
    const authService = DIContainer.sharedContainer.authService
    const userTokenRepository = DIContainer.sharedContainer.userTokenRepository

    let authorizedUser = await authService.loginGoogle(validGoogleAccess)

    const userToken = await userTokenRepository.getById(
      authorizedUser.user._id
    )

    // log user again
    authorizedUser = await authService.loginGoogle(validGoogleAccess)

    // get user token again
    const updatedUserToken = await userTokenRepository.getById(
      authorizedUser.user._id
    )

    expect(userToken).toEqual(updatedUserToken)
  })
})

describe('AuthService refreshSyncSessions', () => {
  const seedOptions: SeedOptions = { users: true }

  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should fail if token is invalid', () => {
    const authService = DIContainer.sharedContainer.authService

    return expect(
      authService.refreshSyncSessions('asdasdas')
    ).rejects.toThrowError(InvalidCredentialsError)
  })
})

describe('AuthService IAM', () => {
  const seedOptions: SeedOptions = { users: true }

  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('OAuth callback should fail with no email in the scope', () => {
    const authService = DIContainer.sharedContainer.authService
    return expect(authService.iamOAuthCallback({ } as any, authService.decodeIAMState('derp'))).rejects.toThrowError(InvalidCredentialsError)
  })

  test('OAuth callback should fail with an invalid payload', () => {
    const authService = DIContainer.sharedContainer.authService
    // base64(x=y:u=v:deviceId=derp) = eD15OnU9djpkZXZpY2VJZD1kZXJwCg==
    return expect(authService.iamOAuthCallback({ email: 'valid-user@manuscriptsapp.com' } as any, authService.decodeIAMState('eD15OnU9djpkZXZpY2VJZD1kZXJwCg=='))).rejects.toThrowError()
  })

  test('IAM OAuth state parsing', () => {
    const authService = DIContainer.sharedContainer.authService
    // base64(x=y:u=v:deviceId=derp) = eD15OnU9djpkZXZpY2VJZD1kZXJwCg==
    return expect(authService.decodeIAMState('eD15OnU9djpkZXZpY2VJZD1kZXJwCg==').deviceId).toEqual('derp\n')
  })
})
