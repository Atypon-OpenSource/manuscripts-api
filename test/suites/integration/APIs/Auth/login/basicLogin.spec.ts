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

import * as HttpStatus from 'http-status-codes'
import * as supertest from 'supertest'
import * as _ from 'lodash'

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { drop, seed, testDatabase, dropBucket } from '../../../../../utilities/db'
import { basicLogin } from '../../../../../api'
import {
  validBody,
  validEmailBody,
  emptyBodyElements,
  emptyEmailBody,
  emptyPasswordBody
} from '../../../../../data/fixtures/credentialsRequestPayload'
import {
  ValidHeaderWithApplicationKey,
  EmptyAcceptJsonHeader,
  EmptyContentTypeAcceptJsonHeader,
  InValidAcceptJsonHeader,
  ValidHeaderWithCharsetAndApplicationKey
} from '../../../../../data/fixtures/headers'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { blockedStatus, blockedStatusButBlockTimeExpired,notVerifiedStatus } from '../../../../../data/fixtures/userStatus'
import { MAX_NUMBER_OF_LOGIN_ATTEMPTS } from '../../../../../../src/DomainServices/Auth/AuthService'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'
import { config } from '../../../../../../src/Config/Config'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }
const existingConfig: any = _.cloneDeep(config)

beforeAll(async () => {
  db = await testDatabase()
})

async function seedAccounts () {
  await DIContainer.sharedContainer.syncService.getOrCreateUserStatus(
      'User|' + validBody.email
    )
}

afterAll(() => db.bucket.disconnect())
afterEach(() => {
  for (const key in existingConfig) {
    const c: any = config
    c[key] = _.cloneDeep(existingConfig[key])
  }
})

describe('Basic Login - POST api/v1/auth/login', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
    await seedAccounts()
  })

  test('ensures user can log in', async () => {
    const response: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )

    expect(response.status).toBe(HttpStatus.OK)
    expect(response.body.token).toBeDefined()

    delete response.body.token
    delete response.body.refreshToken
    delete response.body.recover

    expect(response.body).toEqual({})
  })

  test('should fail if user status does not exists', async () => {
    await DIContainer.sharedContainer.userStatusRepository.remove(null)
    const response: supertest.Response = await basicLogin(
      validEmailBody,
      ValidHeaderWithApplicationKey
    )

    return expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should fail user is blocked', async () => {
    await DIContainer.sharedContainer.userStatusRepository.remove(null)
    await DIContainer.sharedContainer.userStatusRepository.create(blockedStatus)

    const response: supertest.Response = await basicLogin(
      validEmailBody,
      ValidHeaderWithApplicationKey
    )

    return expect(response.status).toBe(HttpStatus.FORBIDDEN)
  })

  test('should fail user is not verified', async () => {
    await DIContainer.sharedContainer.userStatusRepository.remove(null)
    await DIContainer.sharedContainer.userStatusRepository.create(notVerifiedStatus)

    const response: supertest.Response = await basicLogin(
      validEmailBody,
      ValidHeaderWithApplicationKey
    )

    return expect(response.status).toBe(HttpStatus.FORBIDDEN)
  })

  xtest('should block the user if number of failed login attempts exceeds the threshold', async () => {
    await DIContainer.sharedContainer.userEventRepository.remove(null)
    const userEventsCountBefore = await DIContainer.sharedContainer.userEventRepository.count(null)
    expect(userEventsCountBefore).toBe(0)

    const userStatusId = 'UserStatus|User|valid-user@manuscriptsapp.com'
    let userStatus: any = await DIContainer.sharedContainer.userStatusRepository.getById(userStatusId)
    expect(userStatus.blockUntil).toBeNull()

    // MAX_NUMBER_OF_LOGIN_ATTEMPTS * 4 because the failed login counting is only approximate
    // (relies on a lazily updated map-reduce view).
    for (let index = 0; index < MAX_NUMBER_OF_LOGIN_ATTEMPTS * 32; index++) {
      await basicLogin(validEmailBody, ValidHeaderWithApplicationKey)
    }

    // let's wait for those events to have been actually created…
    await DIContainer.sharedContainer.activityTrackingService.awaitCreation()
    const userEventsCount = await DIContainer.sharedContainer.userEventRepository.count(null)
    expect(userEventsCount).toBeGreaterThanOrEqual(MAX_NUMBER_OF_LOGIN_ATTEMPTS)

    // waiting period of time to make sure the view (failedLoginCount) got indexed
    await new Promise(
      (_resolve, reject) => setTimeout(() => basicLogin(
          validEmailBody,
          ValidHeaderWithApplicationKey
        ).then(response => {
          expect(response.status).toBe(HttpStatus.FORBIDDEN)
          return DIContainer.sharedContainer.userStatusRepository.getById(userStatusId)
        }).then((userStatus: any) => {
          expect(new Date(userStatus.blockUntil).getTime()).toBeGreaterThan(new Date().getTime())
        }).catch(error => reject(error)), 15000)
    )
  })

  test('should update user status to be unblocked and log in after blocking expires', async () => {
    await DIContainer.sharedContainer.userStatusRepository.remove(null)
    await DIContainer.sharedContainer.userStatusRepository.create(blockedStatusButBlockTimeExpired, {})

    const response: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithApplicationKey
    )
    expect(response.status).toBe(HttpStatus.OK)

    expect(response.body.token).toBeDefined()
    delete response.body.token
    delete response.body.recover
    expect(response.body).toEqual({})

    const userStatusId = DIContainer.sharedContainer.userStatusRepository.fullyQualifiedId('User|valid-user@manuscriptsapp.com')
    const userStatus: any = await DIContainer.sharedContainer.userStatusRepository.getById(userStatusId)
    expect(userStatus.blockUntil).toBe(null)
  })

  test('ensures a user can not log in if email is valid but password not valid', async () => {
    const response: supertest.Response = await basicLogin(
      validEmailBody,
      ValidHeaderWithApplicationKey
    )

    return expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('ensures a user can not log in if email and password are empty', async () => {
    const response: supertest.Response = await basicLogin(
      emptyBodyElements,
      ValidHeaderWithApplicationKey
    )

    return expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures a user can not log in if email not sent', async () => {
    const response: supertest.Response = await basicLogin(
      emptyEmailBody,
      ValidHeaderWithApplicationKey
    )

    return expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures a user can not log in if password not sent', async () => {
    const response: supertest.Response = await basicLogin(
      emptyPasswordBody,
      ValidHeaderWithApplicationKey
    )

    return expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures api does not work if Content-Type & Accept headers not sent', async () => {
    const response: supertest.Response = await basicLogin(
      validBody,
      EmptyContentTypeAcceptJsonHeader
    )

    return expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures api does not work if Accept header not sent', async () => {
    const response: supertest.Response = await basicLogin(
      validBody,
      EmptyAcceptJsonHeader
    )

    return expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures api does not work if Accept header is invalid', async () => {
    const response: supertest.Response = await basicLogin(
      validBody,
      InValidAcceptJsonHeader
    )

    return expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('ensures basicLogin API does work if Accept and Content-Type headers has charset=UTF-8', async () => {
    const response: supertest.Response = await basicLogin(
      validBody,
      ValidHeaderWithCharsetAndApplicationKey
    )

    expect(response.status).toBe(HttpStatus.OK)
  })
})
