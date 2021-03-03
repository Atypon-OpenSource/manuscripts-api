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

import { Chance } from 'chance'
import '../../../../../utilities/dbMock'
import '../../../../../utilities/configMock'

import { ValidationError } from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { ProjectController } from '../../../../../../src/Controller/V1/Project/ProjectController'
import { authorizationHeader } from '../../../../../data/fixtures/headers'
import { ContainerType } from '../../../../../../src/Models/ContainerModels'
import archiver from 'archiver'
import { generateLoginToken } from '../../../../../../src/Utilities/JWT/LoginTokenPayload'
import tempy from 'tempy'

jest.setTimeout(TEST_TIMEOUT)

const testProjectId = 'testProjectId'

beforeEach(async () => {
  (DIContainer as any)._sharedContainer = null
  await DIContainer.init()

  DIContainer.sharedContainer.userService.profile = async (): Promise<any> => ({ userID: 'foo' })
  DIContainer.sharedContainer.pressroomService.importJATS = jest.fn(async (): Promise<any> => {})

  const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]
  containerService.containerCreate = jest.fn(async (): Promise<any> => ({ id: testProjectId }))
  containerService.updateContainer = jest.fn(async (): Promise<any> => {})
  containerService.getContainer = jest.fn(async (): Promise<any> => {})
})

const chance = new Chance()

describe('ProjectController', () => {
  describe('create', () => {
    const validProjectCreateReq = {
      headers: authorizationHeader(generateLoginToken({
        tokenId: 'foo',
        userId: 'bar',
        appId: 'foobar',
        email: 'foo@bar.com',
        userProfileId: 'foo'
      },null)),

      // going through the encode & decode hoops as encoding adds the 'iat' property.
      body: {
        title: 'foo',
        writers: [ 'User_test@example.com' ],
        owners: [ 'User_test@example.com' ],
        viewers: [ 'User_test@example.com' ]
      }
    }

    test('should call the service successfully', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]

      const controller: any = new ProjectController()
      await expect(controller.create(validProjectCreateReq)).resolves.not.toThrow()

      expect(containerService.containerCreate).toBeCalled()
      expect(containerService.updateContainer).toBeCalled()
      expect(containerService.getContainer).toBeCalledWith(testProjectId)
    })

    test('should work without parameters', async () => {
      const controller: any = new ProjectController()
      await expect(controller.create({ ...validProjectCreateReq, body: {} })).resolves.not.toThrow()
    })

    test('should fail with a validation error with no token', async () => {
      const controller: any = new ProjectController()
      await expect(controller.create({ ...validProjectCreateReq, headers: {} })).rejects.toThrow(ValidationError)
    })
  })

  describe('add', () => {
    test('should call service functions',() => {
      return tempy.write.task('', async tempPath => {
        const controller: any = new ProjectController()

        controller.addManuscriptToProject = jest.fn(async () => {})
        DIContainer.sharedContainer.containerService[ContainerType.project].isOwner = jest.fn(() => true)

        await controller.add({
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: tempPath },
          user: { _id: 'validUserId' },
          body: {}
        })

        expect(DIContainer.sharedContainer.pressroomService.importJATS).toBeCalled()
        expect(controller.addManuscriptToProject).toBeCalled()
      })
    })

    test('should call service functions with manuscriptID specified',() => {
      return tempy.write.task('', async tempPath => {
        const controller: any = new ProjectController()

        controller.addManuscriptToProject = jest.fn(async () => {})
        DIContainer.sharedContainer.containerService[ContainerType.project].isOwner = jest.fn(() => true)

        await controller.add({
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: tempPath },
          user: { _id: 'validUserId' },
          body: { manuscriptId: 'MPManuscript:foobarbaz' }
        })

        expect(DIContainer.sharedContainer.pressroomService.importJATS).toBeCalled()
        expect(controller.addManuscriptToProject).toBeCalled()
      })
    })

    test('should fail with validation error without a projectId', () => {
      return tempy.write.task('', async (tempPath) => {
        const validProjectAddReq = {
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: tempPath },
          user: { _id: 'validUserId' },
          body: {}
        }

        const controller: any = new ProjectController()
        await expect(controller.add({ ...validProjectAddReq,params: { projectId: null } })).rejects.toThrow(ValidationError)
      })
    })

    test('should fail with validation error without a file', () => {
      return tempy.write.task('', async tempPath => {
        const validProjectAddReq = {
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: tempPath },
          user: { _id: 'validUserId' },
          body: {}
        }

        const controller: any = new ProjectController()
        await expect(controller.add({ ...validProjectAddReq, file: {} })).rejects.toThrow(ValidationError)
        await expect(controller.add({ ...validProjectAddReq, file: null })).rejects.toThrow(ValidationError)

      })
    })

    test('should fail with validation error if userService returns falsy profile', () => {
      return tempy.write.task('', async tempPath => {
        const validProjectAddReq = {
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: tempPath },
          user: { _id: 'validUserId' },
          body: {}
        }

        const controller: any = new ProjectController()

        DIContainer.sharedContainer.userService.profile = async (): Promise<any> => null

        await expect(controller.add(validProjectAddReq)).rejects.toThrow(ValidationError)
      })
    })
  })

  describe('addManuscriptToProject', () => {
    test('successfully call services', async () => {
      const controller: any = new ProjectController()

      DIContainer.sharedContainer.containerService[ContainerType.project].addManuscript = jest.fn(async () => {})

      const archive = archiver('zip')
      archive.append(JSON.stringify({
        data: [
          { _id: 'MPManuscript:abc', objectType: 'MPManuscript' },
          { _id: 'MPCitation:abc', objectType: 'MPCitation' },
          { _id: 'MPMPAuxiliaryObjectReference:abc', objectType: 'MPAuxiliaryObjectReference' }
        ]
      }), { name: 'index.manuscript-json' })
      await archive.finalize()

      await controller.addManuscriptToProject({ _id: 'MPProject:abc' }, archive)

      expect(DIContainer.sharedContainer.containerService[ContainerType.project].addManuscript).toBeCalled()
    })
  })
})
