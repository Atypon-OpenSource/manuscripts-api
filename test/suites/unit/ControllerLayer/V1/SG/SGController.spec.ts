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

import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { SGController } from '../../../../../../src/Controller/V1/SG/SGController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  InvalidBucketError,
  InvalidCredentialsError,
  ValidationError,
} from '../../../../../../src/Errors'
import { generateLoginToken } from '../../../../../../src/Utilities/JWT/LoginTokenPayload'
import { authorizationHeader } from '../../../../../data/fixtures/headers'

const headers = authorizationHeader(
  generateLoginToken(
    {
      tokenId: 'foo',
      userId: 'User|bar',
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
          id: 'MPProject:1',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      const sgService: any = DIContainer.sharedContainer.sgService
      sgService.get = jest.fn(() => Promise.resolve())
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      await sgController.get(req)

      expect(sgService.get).toHaveBeenCalled()
    })

    test('should fail if db not found', async () => {
      const req: any = {
        params: {
          db: 'no',
          id: 'MPProject:1',
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
          id: 'MPProject:1',
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
          _id: 'MPProject:1',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      const sgService: any = DIContainer.sharedContainer.sgService
      sgService.create = jest.fn(() => Promise.resolve())
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      await sgController.create(req)

      expect(sgService.create).toHaveBeenCalled()
    })

    test('should fail if db not found', async () => {
      const req: any = {
        params: {
          db: 'no',
        },
        body: {
          _id: 'MPProject:1',
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
          _id: 'MPProject:1',
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
          id: 'MPProject:1',
        },
        body: {
          _id: 'MPProject:1',
        },
        query: {
          rev: 'rev',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      const projectRepository: any = DIContainer.sharedContainer.projectRepository
      projectRepository.patch = jest.fn(() => Promise.resolve())
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      await sgController.update(req)

      expect(projectRepository.patch).toHaveBeenCalled()
    })

    test('should call create in update', async () => {
      const req: any = {
        params: {
          db: 'project',
          id: 'MPProject:1',
        },
        body: {
          _id: 'MPProject:1',
        },
        query: {
          rev: 'rev',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      const projectRepository: any = DIContainer.sharedContainer.projectRepository
      projectRepository.patch = jest.fn(() => Promise.reject(new ValidationError('derp', 'derp')))
      projectRepository.create = jest.fn(() => Promise.resolve())
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      await sgController.update(req)

      expect(projectRepository.create).toHaveBeenCalled()
    })

    test('should fail on update internal server error', async () => {
      const req: any = {
        params: {
          db: 'project',
          id: 'MPProject:1',
        },
        body: {
          _id: 'MPProject:1',
        },
        query: {
          rev: 'rev',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      const projectRepository: any = DIContainer.sharedContainer.projectRepository
      projectRepository.patch = jest.fn(() =>
        Promise.reject(new InvalidBucketError('project' as BucketKey))
      )
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
          id: 'MPProject:1',
        },
        body: {
          _id: 'MPProject:1',
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
          id: 'MPProject:1',
        },
        body: {
          _id: 'MPProject:1',
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
          id: 'MPProject:1',
        },
        body: {
          _id: 'MPProject:1',
        },
        query: {
          rev: 'rev',
        },
        headers: headers,
      }

      const sgController: any = new SGController()
      const sgService: any = DIContainer.sharedContainer.sgService
      sgService.remove = jest.fn(() => Promise.resolve())
      sgController.configuration = {
        buckets: {
          project: req.params.db,
        },
      }

      await sgController.remove(req)

      expect(sgService.remove).toHaveBeenCalled()
    })

    test('should fail if db not found', async () => {
      const req: any = {
        params: {
          db: 'no',
          id: 'MPProject:1',
        },
        body: {
          _id: 'MPProject:1',
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
          id: 'MPProject:1',
        },
        body: {
          _id: 'MPProject:1',
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
