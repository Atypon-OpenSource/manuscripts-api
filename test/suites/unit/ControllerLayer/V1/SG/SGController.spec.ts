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

import { SGController } from '../../../../../../src/Controller/V1/SG/SGController'
import {
  ValidationError,
  InvalidBucketError,
  InvalidCredentialsError,
} from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { authorizationHeader } from '../../../../../data/fixtures/headers'
import { generateLoginToken } from '../../../../../../src/Utilities/JWT/LoginTokenPayload'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'

const headers = authorizationHeader(
  generateLoginToken(
    {
      tokenId: 'foo',
      userId: 'bar',
      appId: 'foobar',
      email: 'foo@bar.com',
      userProfileId: 'foo',
    },
    null
  )
)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('SGController', () => {
  describe('get', () => {
    test('should call get', async () => {
      const req: any = {
        params: {
          db: 'project',
          id: 'id',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      sgController.repoMap = {
        id: {
          getById: jest.fn(() => Promise.resolve()),
        },
      }
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      await sgController.get(req)

      expect(sgController.repoMap.id.getById).toBeCalled()
    })

    test('should fail if db not found', async () => {
      const req: any = {
        params: {
          db: 'no',
          id: 'id',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      return expect(sgController.get(req)).rejects.toThrow(InvalidBucketError)
    })

    test('should fail if wrong auth headers', async () => {
      const req: any = {
        params: {
          db: 'project',
          id: 'id',
        },
        headers: authorizationHeader('derp'),
      }

      const sgController: any = new SGController()
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      return expect(sgController.get(req)).rejects.toThrow(InvalidCredentialsError)
    })
  })

  describe('create', () => {
    test('should call create', async () => {
      const req: any = {
        params: {
          db: 'project',
        },
        body: {
          _id: 'id',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      sgController.repoMap = {
        id: {
          create: jest.fn(() => Promise.resolve()),
        },
      }
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      await sgController.create(req)

      expect(sgController.repoMap.id.create).toBeCalled()
    })

    test('should fail if db not found', async () => {
      const req: any = {
        params: {
          db: 'no',
        },
        body: {
          _id: 'id',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      return expect(sgController.create(req)).rejects.toThrow(InvalidBucketError)
    })

    test('should fail if wrong auth headers', async () => {
      const req: any = {
        params: {
          db: 'project',
        },
        body: {
          _id: 'id',
        },
        headers: authorizationHeader('derp'),
      }

      const sgController: any = new SGController()
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      return expect(sgController.create(req)).rejects.toThrow(InvalidCredentialsError)
    })
  })

  describe('update', () => {
    test('should call update', async () => {
      const req: any = {
        params: {
          db: 'project',
          id: 'id',
        },
        body: {
          _id: 'id',
        },
        query: {
          rev: 'rev',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      sgController.repoMap = {
        id: {
          patch: jest.fn(() => Promise.resolve()),
        },
      }
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      await sgController.update(req)

      expect(sgController.repoMap.id.patch).toBeCalled()
    })

    test('should call create in update', async () => {
      const req: any = {
        params: {
          db: 'project',
          id: 'id',
        },
        body: {
          _id: 'id',
        },
        query: {
          rev: 'rev',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      sgController.repoMap = {
        id: {
          patch: jest.fn(() => Promise.reject(new ValidationError('derp', 'derp'))),
          create: jest.fn(() => Promise.resolve()),
        },
      }
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      await sgController.update(req)

      expect(sgController.repoMap.id.create).toBeCalled()
    })

    test('should fail on update internal server error', async () => {
      const req: any = {
        params: {
          db: 'project',
          id: 'id',
        },
        body: {
          _id: 'id',
        },
        query: {
          rev: 'rev',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      sgController.repoMap = {
        id: {
          patch: jest.fn(() => Promise.reject(new InvalidBucketError('project' as BucketKey))),
        },
      }
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      return expect(sgController.update(req)).rejects.toThrow(InvalidBucketError)
    })

    test('should fail if db not found', async () => {
      const req: any = {
        params: {
          db: 'no',
          id: 'id',
        },
        body: {
          _id: 'id',
        },
        query: {
          rev: 'rev',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      return expect(sgController.update(req)).rejects.toThrow(InvalidBucketError)
    })

    test('should fail if wrong auth headers', async () => {
      const req: any = {
        params: {
          db: 'project',
          id: 'id',
        },
        body: {
          _id: 'id',
        },
        query: {
          rev: 'rev',
        },
        headers: authorizationHeader('derp'),
      }

      const sgController: any = new SGController()
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      return expect(sgController.update(req)).rejects.toThrow(InvalidCredentialsError)
    })
  })

  describe('delete', () => {
    test('should call delete', async () => {
      const req: any = {
        params: {
          db: 'project',
          id: 'id',
        },
        body: {
          _id: 'id',
        },
        query: {
          rev: 'rev',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      sgController.repoMap = {
        id: {
          remove: jest.fn(() => Promise.resolve()),
        },
      }
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      await sgController.remove(req)

      expect(sgController.repoMap.id.remove).toBeCalled()
    })

    test('should fail if db not found', async () => {
      const req: any = {
        params: {
          db: 'no',
          id: 'id',
        },
        body: {
          _id: 'id',
        },
        query: {
          rev: 'rev',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      return expect(sgController.remove(req)).rejects.toThrow(InvalidBucketError)
    })

    test('should fail if wrong auth headers', async () => {
      const req: any = {
        params: {
          db: 'project',
          id: 'id',
        },
        body: {
          _id: 'id',
        },
        query: {
          rev: 'rev',
        },
        headers: authorizationHeader('derp'),
      }

      const sgController: any = new SGController()
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      return expect(sgController.remove(req)).rejects.toThrow(InvalidCredentialsError)
    })
  })
})
