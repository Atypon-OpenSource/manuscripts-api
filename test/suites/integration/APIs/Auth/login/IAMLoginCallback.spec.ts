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
import * as jsonwebtoken from 'jsonwebtoken'

import { drop, testDatabase, seed } from '../../../../../utilities/db'
import { iamOAuthCallback } from '../../../../../api'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { AuthService } from '../../../../../../src/DomainServices/Auth/AuthService'
import { validApplication } from '../../../../../data/fixtures/applications'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null

beforeAll(async () => (db = await testDatabase()))
afterAll(() => db.bucket.disconnect())

describe('GET api/v1/auth/iam/callback', () => {
  beforeEach(async () => {
    await drop()
    await seed({ users: true })
  })

  test('should fail if query is not sent', async () => {
    const response: supertest.Response = await iamOAuthCallback(null, {})
    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if state is missing', async () => {
    const response: supertest.Response = await iamOAuthCallback({}, {})

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('should fail if cookie is missing', async () => {
    const token = jsonwebtoken.sign(
      {
        email: 'foo@bar.com',
        iss: 'https://atypon-iam-test.atypon.com',
        sub: 'anything',
        sid: 'anything',
        nonce: 'random-string',
        email_verified: true,
        exp: Date.now(),
        aud: validApplication._id
      } as any,
      'asd'
    )

    const state = AuthService.encodeIAMState({
      deviceId: 'deviceId',
      redirectUri: 'redirectUri',
      theme: 'theme',
      redirectBaseUri: ''
    })

    const response: supertest.Response = await iamOAuthCallback(
      {
        state,
        id_token: token
      },
      {}
    )

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should redirect if error in query', async () => {
    const token = jsonwebtoken.sign(
      {
        email: 'foo@bar.com',
        iss: 'atypon.com',
        sub: 'anything',
        nonce: 'random-string',
        email_verified: true,
        exp: Date.now()
      } as any,
      'asd'
    )

    const response: supertest.Response = await iamOAuthCallback(
      {
        error: 'Error',
        error_description: 'An error occured',
        state: 'anything',
        id_token: token
      },
      { cookie: 'nonce=random-string' }
    )

    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
  })

  test('should redirect if the user created successfully and the same email not allowed to be used', async () => {
    const token = jsonwebtoken.sign(
      {
        email: 'foo@bar96.com',
        iss: 'https://atypon-iam-test.atypon.com',
        sub: 'anything',
        sid: 'anything',
        nonce: 'random-string',
        email_verified: true,
        exp: Date.now(),
        name: 'Foobarovic',
        aud: validApplication._id
      } as any,
      'asd'
    )

    const state = AuthService.encodeIAMState({
      deviceId: 'deviceId',
      redirectUri: 'redirectUri',
      theme: 'theme',
      redirectBaseUri: ''
    })

    const response: supertest.Response = await iamOAuthCallback(
      {
        state,
        id_token: token
      },
      { cookie: 'nonce=random-string' }
    )

    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)

    const token2 = jsonwebtoken.sign(
      {
        email: 'foo@bar96.com',
        iss: 'atypon.com',
        sub: 'anything-else',
        nonce: 'random-string',
        email_verified: true,
        exp: Date.now(),
        name: 'Foobarovic',
        aud: validApplication._id
      } as any,
      'asd'
    )

    const response2: supertest.Response = await iamOAuthCallback(
      {
        state,
        id_token: token2
      },
      { cookie: 'nonce=random-string' }
    )

    expect(response2.status).toBe(HttpStatus.MOVED_TEMPORARILY)
    expect(response2.text).toContain(
      encodeURIComponent('Email foo@bar96.com is not available')
    )
  })

  test('should redirect if the user retrieved successfully', async () => {
    const token = jsonwebtoken.sign(
      {
        email: 'valid-user@manuscriptsapp.com',
        iss: 'https://atypon-iam-test.atypon.com',
        sub: 'anything',
        sid: 'anything',
        nonce: 'random-string',
        email_verified: true,
        exp: new Date((new Date()).getTime() + (24 * 60 * 60 * 1000)).getTime(),
        name: 'Foobarovic',
        aud: validApplication._id
      } as any,
      'asd' // signature not verified: The DIContainer created as part of seeding data above has fake iamTokenVerifier + jwksClient.
    )

    const state = AuthService.encodeIAMState({
      deviceId: 'deviceId',
      redirectUri: 'redirectUri',
      theme: 'theme',
      redirectBaseUri: ''
    })

    const response: supertest.Response = await iamOAuthCallback(
      {
        state,
        id_token: token
      },
      { cookie: 'nonce=random-string' }
    )

    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
  })

  test('should create user status if does not exist', async () => {
    const token = jsonwebtoken.sign(
      {
        email: 'valid-user-1@manuscriptsapp.com',
        iss: 'https://atypon-iam-test.atypon.com',
        sub: 'anything',
        sid: 'anything',
        nonce: 'random-string',
        email_verified: true,
        exp: Date.now(),
        name: 'Foobarovic',
        aud: validApplication._id
      } as any,
      'asd' // signature not verified: The DIContainer created as part of seeding data above has fake iamTokenVerifier + jwksClient.
    )

    const state = AuthService.encodeIAMState({
      deviceId: 'deviceId',
      redirectUri: 'redirectUri',
      theme: 'theme',
      redirectBaseUri: ''
    })

    const response: supertest.Response = await iamOAuthCallback(
      {
        state,
        id_token: token
      },
      { cookie: 'nonce=random-string' }
    )

    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
  })

  test('should redirect to redirectBaseUrl if it is a permitted URL', async () => {
    const token = jsonwebtoken.sign(
      {
        email: 'foo@bar96.com',
        iss: 'https://atypon-iam-test.atypon.com',
        sub: 'anything',
        sid: 'anything',
        nonce: 'random-string',
        email_verified: true,
        exp: Date.now(),
        name: 'Foobarovic',
        aud: validApplication._id
      } as any,
      'asd'
    )

    const state = AuthService.encodeIAMState({
      deviceId: 'deviceId',
      redirectUri: 'redirectUri',
      theme: 'theme',
      redirectBaseUri: 'https://lw-manuscripts-frontend.ciplit.com'
    })

    const response: supertest.Response = await iamOAuthCallback(
      {
        state,
        id_token: token
      },
      { cookie: 'nonce=random-string' }
    )
    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
    expect(response.header.location).toEqual(
        expect.stringContaining('https://lw-manuscripts-frontend.ciplit.com')
    )
  })

  test('should set SG cookie as a wild card based on redirectBaseUri', async () => {
    const token = jsonwebtoken.sign(
      {
        email: 'foo@bar96.com',
        iss: 'https://atypon-iam-test.atypon.com',
        sub: 'anything',
        sid: 'anything',
        nonce: 'random-string',
        email_verified: true,
        exp: Date.now(),
        name: 'Foobarovic',
        aud: validApplication._id
      } as any,
      'asd'
    )

    const state = AuthService.encodeIAMState({
      deviceId: 'deviceId',
      redirectUri: 'redirectUri',
      theme: 'theme',
      redirectBaseUri: 'https://lw-manuscripts-frontend.ciplit.com'
    })

    const response: supertest.Response = await iamOAuthCallback(
      {
        state,
        id_token: token
      },
      { cookie: 'nonce=random-string' }
    )
    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
    expect(response.header.location).toEqual(
      expect.stringContaining('https://lw-manuscripts-frontend.ciplit.com')
    )
    const regx = new RegExp(/Domain=(.*?)\;.*(\1)/)
    const cookies = JSON.stringify(response.header['set-cookie'])
    const part = regx.exec(cookies)
    // @ts-ignore
    expect(part[1]).toEqual('.ciplit.com')
  })

  test('should redirect to default URL when redirectBaseUri is not permitted', async () => {
    const token = jsonwebtoken.sign(
        {
          email: 'valid-user@manuscriptsapp.com',
          iss: 'https://atypon-iam-test.atypon.com',
          sub: 'anything',
          sid: 'anything',
          nonce: 'random-string',
          email_verified: true,
          exp: Date.now(),
          name: 'Foobarovic',
          aud: validApplication._id
        } as any,
        'asd' // signature not verified: The DIContainer created as part of seeding data above has fake iamTokenVerifier + jwksClient.
    )
    const state = AuthService.encodeIAMState({
      deviceId: 'deviceId',
      redirectUri: 'redirectUri',
      theme: 'theme',
      redirectBaseUri: 'http://0.0.0.0:8080'
    })

    const response: supertest.Response = await iamOAuthCallback(
      {
        state,
        id_token: token
      },
      { cookie: 'nonce=random-string' }
    )
    expect(response.status).toBe(HttpStatus.MOVED_TEMPORARILY)
    expect(response.header.location).toEqual(
        expect.stringContaining('http://library.manuscripts.io:8080')
    )
  })
})
