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
import { Response, Request, NextFunction } from 'express'

import { markUserForDeletion, unmarkUserForDeletion, getProfile } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import { invalidJWTToken } from '../../../..//data/fixtures/authServiceUser'
import {
  ValidContentTypeAcceptJsonHeader,
  authorizationHeader
} from '../../../../data/fixtures/headers'
import { AuthStrategy } from '../../../../../src/Auth/Passport/AuthStrategy'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'

let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true }

beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

jest.setTimeout(TEST_TIMEOUT)

describe('UserService - markUserForDeletion', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('markUserForDeletion should fail if the user is not found', async () => {
    AuthStrategy.JWTAuth = (req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = {
        _id: 'User|invalid-user@manuscriptsapp.com'
      }
      return next()
    }
    const response: supertest.Response = await markUserForDeletion({
      ...ValidContentTypeAcceptJsonHeader
    })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('markUserForDeletion should fail if the user password missing while connect disabled', async () => {
    AuthStrategy.JWTAuth = (req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = {
        _id: 'User|valid-user-1@manuscriptsapp.com'
      }
      return next()
    }
    const response: supertest.Response = await markUserForDeletion({
      ...ValidContentTypeAcceptJsonHeader
    })

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('markUserForDeletion should fail if the user status is not found', async () => {
    AuthStrategy.JWTAuth = (req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = {
        _id: 'User|valid-user-1@manuscriptsapp.com'
      }
      return next()
    }
    const response: supertest.Response = await markUserForDeletion(
      {
        ...ValidContentTypeAcceptJsonHeader
      },
      {
        password: '12345'
      }
      )

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('markUserForDeletion should fail if the password mismatched', async () => {
    AuthStrategy.JWTAuth = (req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = {
        _id: 'User|valid-user@manuscriptsapp.com'
      }
      return next()
    }
    const response: supertest.Response = await markUserForDeletion(
      {
        ...ValidContentTypeAcceptJsonHeader
      },
      {
        password: 'wrong password'
      }
      )

    expect(response.status).toBe(HttpStatus.FORBIDDEN)
  })
})

describe('UserService - unmarkUserForDeletion', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('unmarkUserForDeletion should fail if the user is not found', async () => {
    AuthStrategy.JWTAuth = (req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = {
        _id: 'User|invalid-user@manuscriptsapp.com'
      }
      return next()
    }
    const response: supertest.Response = await unmarkUserForDeletion({
      ...ValidContentTypeAcceptJsonHeader
    })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})

describe('UserService - getProfile', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('getProfile should fail if the token is invalid', async () => {
    const authHeader = authorizationHeader(invalidJWTToken)

    const response: supertest.Response = await getProfile(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      }
      )

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

})
