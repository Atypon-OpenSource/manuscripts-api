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
import checksum from 'checksum'

import { Response, Request, NextFunction } from 'express'

import { invite, inviteToContainer, uninvite } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import {
  ValidContentTypeAcceptJsonHeader,
  authorizationHeader
} from '../../../../data/fixtures/headers'
import {
  validInvitation,
  validProjectInvitation
} from '../../../../data/fixtures/invitation'
import { AuthStrategy } from '../../../../../src/Auth/Passport/AuthStrategy'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)
let db: any = null

beforeAll(async () => {
  db = await testDatabase()
})

afterAll(() => {
  db.bucket.disconnect()
})

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk'

describe('InvitationService - invite', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true })
  })

  test('should fail if inviting user does not exist', async () => {
    const header = authorizationHeader(token)
    AuthStrategy.JWTAuth = (
      req: Request,
      _res: Response,
      next: NextFunction
    ) => {
      (req as any).user = {
        _id: 'User|invalid-user@manuscriptsapp.com'
      }
      return next()
    }

    const response: supertest.Response = await invite(validInvitation, {
      ...ValidContentTypeAcceptJsonHeader,
      ...header
    })

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})

describe('InvitationService - projectInvite', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true })
  })

  test('should fail if inviting user does not exist', async () => {
    const header = authorizationHeader(token)
    AuthStrategy.JWTAuth = (
      req: Request,
      _res: Response,
      next: NextFunction
    ) => {
      (req as any).user = {
        _id: 'User|invalid-user@manuscriptsapp.com'
      }
      return next()
    }

    const response: supertest.Response = await inviteToContainer(
      validProjectInvitation,
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      },
      {
        containerID: 'MPProject:valid-project-id-2'
      }
    )

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})

describe('InvitationService - uninvite', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true, applications: true })
  })

  test('should fail if project owner does not exist', async () => {
    const header = authorizationHeader(token)
    AuthStrategy.JWTAuth = (
      req: Request,
      _res: Response,
      next: NextFunction
    ) => {
      (req as any).user = {
        _id: 'User|invalid-user@manuscriptsapp.com'
      }
      return next()
    }

    const invitationId = `MPContainerInvitation:${checksum(
      'valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-valid-project-id-2',
      { algorithm: 'sha1' }
    )}`
    const response: supertest.Response = await uninvite(
      { invitationId },
      {
        ...ValidContentTypeAcceptJsonHeader,
        ...header
      }
    )

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })
})
