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

import { changePassword } from '../../../../../api'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { drop, seed, testDatabase, dropBucket } from '../../../../../utilities/db'
import { ValidContentTypeAcceptJsonHeader } from '../../../../../data/fixtures/headers'
import { AuthStrategy } from '../../../../../../src/Auth/Passport/AuthStrategy'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)
let db: any = null

beforeAll(async () => {
  db = await testDatabase()
})

afterAll(() => {
  db.bucket.disconnect()
})

describe('change Password - POST api/v1/auth/changePassword', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true })
  })

  test('should fail if user does not exist', async () => {
    AuthStrategy.JWTAuth = (req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = {
        _id: 'User|invalid-user@manuscriptsapp.com'
      }
      return next()
    }

    const response: supertest.Response = await changePassword({ currentPassword: '12345', newPassword: '12345678', deviceId: '9f338224-b0d5-45aa-b02c-21c7e0c3c07b' },{
      ...ValidContentTypeAcceptJsonHeader
    })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('should fail if user status does not exist', async () => {
    AuthStrategy.JWTAuth = (req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = {
        _id: 'User|valid-user-1@manuscriptsapp.com'
      }
      return next()
    }

    const response: supertest.Response = await changePassword({ currentPassword: '12345', newPassword: '12345678', deviceId: '9f338224-b0d5-45aa-b02c-21c7e0c3c07b' },{
      ...ValidContentTypeAcceptJsonHeader
    })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})
