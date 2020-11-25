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
import { Chance } from 'chance'

import { create, manageUserRole, getArchive } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { invalidJWTToken } from '../../../../data/fixtures/authServiceUser'
import {
  ValidContentTypeAcceptJsonHeader,
  authorizationHeader
} from '../../../../data/fixtures/headers'
import { AuthStrategy } from '../../../../../src/Auth/Passport/AuthStrategy'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'

const chance = new Chance()
let db: any = null
const seedOptions: SeedOptions = { users: true, applications: true, projects: true }

beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

jest.setTimeout(TEST_TIMEOUT)

AuthStrategy.JWTAuth = async (_req: Request, _res: Response, next: NextFunction) => {
  return next()
}

describe('ProjectService - createProject', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('createProject should fail if the token is invalid', async () => {
    const authHeader = authorizationHeader(invalidJWTToken)

    const response: supertest.Response = await create(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      }, {},{
        containerType: 'project'
      })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('createProject should fail if the user is not found', async () => {
    const authHeader = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnxpbnZhbGlkLXVzZXJAbWFudXNjcmlwdHNhcHAuY29tK2RldmljZUlkIiwidXNlcklkIjoiVXNlcnxpbnZhbGlkLXVzZXJAbWFudXNjcmlwdHNhcHAuY29tIiwiYXBwSWQiOiJBcHBsaWNhdGlvbnw5YTkwOTBkOS02Zjk1LTQyMGMtYjkwMy01NDNmMzJiNTE0MGYiLCJpYXQiOjE1MjIyNTM5Njd9.Eu5wp186NoR19P25zayPlZXhSfJeaW-q1eSDzW88k6c')

    const response: supertest.Response = await create(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      }, {},{
        containerType: 'project'
      })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('createProject should fail if the user status is not found', async () => {
    const authHeader = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyLTFAbWFudXNjcmlwdHNhcHAuY29tK2RldmljZUlkIiwidXNlcklkIjoiVXNlcnx2YWxpZC11c2VyLTFAbWFudXNjcmlwdHNhcHAuY29tIiwiYXBwSWQiOiJBcHBsaWNhdGlvbnw5YTkwOTBkOS02Zjk1LTQyMGMtYjkwMy01NDNmMzJiNTE0MGYiLCJpYXQiOjE1MjIyNTM5Njd9.2DpnZl1i1LD-5oHNsm1HJZtaHMVY0Y3xiTwgelNypAI')
    const response: supertest.Response = await create(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      }, {},{
        containerType: 'project'
      })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  test('createProject should fail if the user is blocked', async () => {
    const authHeader = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyLWJsb2NrZWRAbWFudXNjcmlwdHNhcHAuY29tK2RldmljZUlkIiwidXNlcklkIjoiVXNlcnx2YWxpZC11c2VyLWJsb2NrZWRAbWFudXNjcmlwdHNhcHAuY29tIiwiYXBwSWQiOiJBcHBsaWNhdGlvbnw5YTkwOTBkOS02Zjk1LTQyMGMtYjkwMy01NDNmMzJiNTE0MGYiLCJpYXQiOjE1MjIyNTM5Njd9.-k2wWEJLp-8VV3op_41sqA0CZXncg5zruZTtewrpRWo')
    const response: supertest.Response = await create(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      }, {},{
        containerType: 'project'
      })

    expect(response.status).toBe(HttpStatus.FORBIDDEN)
  })

  test('createProject should fail if the user is not verified', async () => {
    const authHeader = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyLTJAbWFudXNjcmlwdHNhcHAuY29tK2RldmljZUlkIiwidXNlcklkIjoiVXNlcnx2YWxpZC11c2VyLTJAbWFudXNjcmlwdHNhcHAuY29tIiwiYXBwSWQiOiJBcHBsaWNhdGlvbnw5YTkwOTBkOS02Zjk1LTQyMGMtYjkwMy01NDNmMzJiNTE0MGYiLCJpYXQiOjE1MjIyNTM5Njd9.cFrZyqfV615Fz7f4ztUsWl1nEzwBQLHBKke-K5wG_8A')
    const response: supertest.Response = await create(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      }, {},{
        containerType: 'project'
      })

    expect(response.status).toBe(HttpStatus.FORBIDDEN)
  })
})

describe('ProjectService - manageUserRole', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('manageUserRole should fail if the user is not found', async () => {
    const authHeader = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnxpbnZhbGlkLXVzZXJAbWFudXNjcmlwdHNhcHAuY29tK2RldmljZUlkIiwidXNlcklkIjoiVXNlcnxpbnZhbGlkLXVzZXJAbWFudXNjcmlwdHNhcHAuY29tIiwiYXBwSWQiOiJBcHBsaWNhdGlvbnw5YTkwOTBkOS02Zjk1LTQyMGMtYjkwMy01NDNmMzJiNTE0MGYiLCJpYXQiOjE1MjIyNTM5Njd9.Eu5wp186NoR19P25zayPlZXhSfJeaW-q1eSDzW88k6c')

    const response: supertest.Response = await manageUserRole(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      }, {
        managedUserId: chance.string(),
        newRole: chance.string()
      }, {
        containerID: 'MPProject:1996'
      })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})

describe('ContainerService - getArchive', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('getArchive should fail if the user not found', async () => {
    const authHeader = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnxpbnZhbGlkLXVzZXJAbWFudXNjcmlwdHNhcHAuY29tK2RldmljZUlkIiwidXNlcklkIjoiVXNlcnxpbnZhbGlkLXVzZXJAbWFudXNjcmlwdHNhcHAuY29tIiwiYXBwSWQiOiJBcHBsaWNhdGlvbnw5YTkwOTBkOS02Zjk1LTQyMGMtYjkwMy01NDNmMzJiNTE0MGYiLCJpYXQiOjE1MjIyNTM5Njd9.Eu5wp186NoR19P25zayPlZXhSfJeaW-q1eSDzW88k6c')

    const response: supertest.Response = await getArchive(
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...authHeader
      }, {}, {
        containerID: 'MPProject:valid-project-id'
      })

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })

  test('getArchive should fail if the user is unauthenticated and the project is private', async () => {
    const response: supertest.Response = await getArchive(
      {
        ...ValidContentTypeAcceptJsonHeader
      }, {}, {
        containerID: 'MPProject:valid-project-id'
      })

    expect(response.status).toBe(HttpStatus.BAD_REQUEST)
  })
})
