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

/*!
 * © 2023 Atypon Systems LLC
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
import '../../../../../utilities/configMock'

import { Chance } from 'chance'
import fs from 'fs'
import tempy from 'tempy'

import { ProjectController } from '../../../../../../src/Controller/V2/Project/ProjectController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ContainerService } from '../../../../../../src/DomainServices/Container/ContainerService'
import { UserService } from '../../../../../../src/DomainServices/User/UserService'
import {
  InvalidCredentialsError,
  MissingManuscriptError,
  MissingModelError,
  MissingTemplateError,
  RecordNotFoundError,
  RoleDoesNotPermitOperationError,
  ValidationError,
} from '../../../../../../src/Errors'
import { generateLoginToken } from '../../../../../../src/Utilities/JWT/LoginTokenPayload'
import { validJWTToken } from '../../../../../data/fixtures/authServiceUser'
import { authorizationHeader } from '../../../../../data/fixtures/headers'
import { validManuscript1 } from '../../../../../data/fixtures/manuscripts'
import { validProject } from '../../../../../data/fixtures/projects'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

const testProjectId = 'testProjectId'

const chance = new Chance()

describe('ProjectController', () => {
  beforeEach(async () => {
    ;(DIContainer as any)._sharedContainer = null
    await DIContainer.init()
  })
  describe('create', () => {
    const validProjectCreateReq = {
      headers: authorizationHeader(
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
      ),

      // going through the encode & decode hoops as encoding adds the 'iat' property.
      body: {
        title: 'foo',
        writers: ['User_test@example.com'],
        owners: ['User_test@example.com'],
        viewers: ['User_test@example.com'],
      },
    }

    test('should call the service successfully', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService

      const controller: any = new ProjectController()

      containerService.createContainer = jest.fn(async () => ({ _id: testProjectId }))
      containerService.updateContainerTitleAndCollaborators = jest.fn()
      containerService.getContainer = jest.fn()

      await expect(controller.create(validProjectCreateReq)).resolves.not.toThrow()

      expect(containerService.createContainer).toHaveBeenCalled()
      expect(containerService.updateContainerTitleAndCollaborators).toHaveBeenCalled()
      expect(containerService.getContainer).toHaveBeenCalledWith(testProjectId)
    })

    test('should work without parameters', async () => {
      const controller: any = new ProjectController()
      const containerService: any = DIContainer.sharedContainer.containerService
      containerService.createContainer = jest.fn(async () => ({ id: testProjectId }))
      containerService.updateContainerTitleAndCollaborators = jest.fn()
      containerService.getContainer = jest.fn()
      await expect(controller.create({ ...validProjectCreateReq, body: {} })).resolves.not.toThrow()
    })

    test('should fail with a validation error with no token', async () => {
      const controller: any = new ProjectController()
      await expect(controller.create({ ...validProjectCreateReq, headers: {} })).rejects.toThrow(
        ValidationError
      )
    })
    it('should work without projectId', async () => {
      const controller = new ProjectController()
      const containerService = DIContainer.sharedContainer.containerService

      // @ts-ignore
      containerService.createContainer = jest.fn(async () => ({ _id: 'container456' }))
      containerService.updateContainerTitleAndCollaborators = jest.fn()
      // @ts-ignore
      containerService.getContainer = jest.fn(async () => ({
        _id: 'container456',
        title: 'My new container',
        owners: ['bar'],
      }))

      const req = {
        headers: authorizationHeader(
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
        ),
        body: {
          title: 'My new container',
          owners: ['User_test@example.com'],
        },
      }

      // @ts-ignore
      await expect(controller.create(req)).resolves.not.toThrow()

      expect(containerService.createContainer).toHaveBeenCalledWith(expect.any(String), null)
      expect(containerService.updateContainerTitleAndCollaborators).toHaveBeenCalledWith(
        'container456',
        'My new container',
        ['bar'],
        undefined,
        undefined
      )
      expect(containerService.getContainer).toHaveBeenCalledWith('container456')
    })
  })

  describe('add', () => {
    beforeEach(async () => {
      DIContainer.sharedContainer.userService.profile = async (): Promise<any> => ({
        userID: 'foo',
      })
      DIContainer.sharedContainer.pressroomService.importJATS = jest.fn(
        async (): Promise<any> => Promise.resolve()
      )

      const containerService: any = DIContainer.sharedContainer.containerService
      containerService.createContainer = jest.fn(async (): Promise<any> => ({ id: testProjectId }))
      containerService.updateContainer = jest.fn(async (): Promise<any> => Promise.resolve())
      containerService.getContainer = jest.fn(async (): Promise<any> => Promise.resolve())
    })
    test('should fail not owner', () => {
      return tempy.write.task('{key: value}', async (tempPath) => {
        const controller: any = new ProjectController()
        controller.extractFiles = jest.fn(async () =>
          Promise.resolve({ 'index.manuscript-json': { data: '{}' } })
        )
        controller.upsertManuscriptToProject = jest.fn(async () => Promise.resolve())
        ContainerService.isOwner = jest.fn(() => false)

        await expect(
          controller.add({
            headers: authorizationHeader(chance.string()),
            params: { projectId: 'MPProject:abc' },
            file: { path: tempPath },
            user: { _id: 'validUserId' },
            body: {},
          })
        ).rejects.toThrow(RoleDoesNotPermitOperationError)
      })
    })
    test('should fail file not found', () => {
      return tempy.write.task('{key: value}', async (tempPath) => {
        const controller: any = new ProjectController()
        controller.extractFiles = jest.fn(async () => Promise.resolve())
        controller.upsertManuscriptToProject = jest.fn(async () => Promise.resolve())
        ContainerService.isOwner = jest.fn(() => true)

        await expect(
          controller.add({
            headers: authorizationHeader(chance.string()),
            params: { projectId: 'MPProject:abc' },
            file: { path: tempPath },
            user: { _id: 'validUserId' },
            body: {},
          })
        ).rejects.toThrow(ValidationError)
      })
    })
    test('should call service functions', () => {
      return tempy.write.task('{key: value}', async (tempPath) => {
        const controller: any = new ProjectController()
        controller.extractFiles = jest.fn(async () =>
          Promise.resolve({ 'index.manuscript-json': { data: '{}' } })
        )
        controller.upsertManuscriptToProject = jest.fn(async () => Promise.resolve())
        ContainerService.isOwner = jest.fn(() => true)

        await controller.add({
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: tempPath },
          user: { _id: 'validUserId' },
          body: {},
        })

        expect(DIContainer.sharedContainer.pressroomService.importJATS).toHaveBeenCalled()
        expect(controller.upsertManuscriptToProject).toHaveBeenCalled()
      })
    })

    test('should call service functions with manuscriptID specified', () => {
      return tempy.write.task('{key: value}', async (tempPath) => {
        const controller: any = new ProjectController()
        controller.extractFiles = jest.fn(async () =>
          Promise.resolve({ 'index.manuscript-json': { data: '{}' } })
        )
        controller.upsertManuscriptToProject = jest.fn(async () => Promise.resolve())
        ContainerService.isOwner = jest.fn(() => true)

        await controller.add({
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: tempPath },
          user: { _id: 'validUserId' },
          body: { manuscriptId: 'MPManuscript:foobarbaz' },
        })

        expect(DIContainer.sharedContainer.pressroomService.importJATS).toHaveBeenCalled()
        expect(controller.upsertManuscriptToProject).toHaveBeenCalled()
      })
    })
    test('should fail with validation error without a projectId', () => {
      return tempy.write.task('', async (tempPath) => {
        const validProjectAddReq = {
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: tempPath },
          user: { _id: 'validUserId' },
          body: {},
        }

        const controller: any = new ProjectController()
        await expect(
          controller.add({ ...validProjectAddReq, params: { projectId: null } })
        ).rejects.toThrow(ValidationError)
      })
    })

    test('should fail with validation error without a file', () => {
      return tempy.write.task('', async (tempPath) => {
        const validProjectAddReq = {
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: tempPath },
          user: { _id: 'validUserId' },
          body: {},
        }

        const controller: any = new ProjectController()
        await expect(controller.add({ ...validProjectAddReq, file: {} })).rejects.toThrow(
          ValidationError
        )
        await expect(controller.add({ ...validProjectAddReq, file: null })).rejects.toThrow(
          ValidationError
        )
      })
    })

    test('should fail with validation error if userService returns falsy profile', () => {
      return tempy.write.task('', async (tempPath) => {
        const validProjectAddReq = {
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: tempPath },
          user: { _id: 'validUserId' },
          body: {},
        }

        const controller: any = new ProjectController()

        DIContainer.sharedContainer.userService.profile = async (): Promise<any> => null

        await expect(controller.add(validProjectAddReq)).rejects.toThrow(ValidationError)
      })
    })
  })

  describe('saveProject', () => {
    beforeEach(async () => {
      DIContainer.sharedContainer.userService.profile = async (): Promise<any> => ({
        userID: 'foo',
      })
      DIContainer.sharedContainer.pressroomService.importJATS = jest.fn(
        async (): Promise<any> => Promise.resolve()
      )

      const containerService: any = DIContainer.sharedContainer.containerService
      containerService.createContainer = jest.fn(async (): Promise<any> => ({ id: testProjectId }))
      containerService.updateContainer = jest.fn(async (): Promise<any> => Promise.resolve())
      containerService.getContainer = jest.fn(async (): Promise<any> => Promise.resolve())
    })
    test('should call upsertProjectModels', async () => {
      const controller: any = new ProjectController()
      const containerService = DIContainer.sharedContainer.containerService
      const manuscriptRepo: any = DIContainer.sharedContainer.manuscriptRepository
      manuscriptRepo.getById = jest.fn(() => validManuscript1)
      containerService.upsertProjectModels = jest.fn(async () => Promise.resolve())
      ContainerService.userIdForSync = jest.fn((id) => id)
      const jsonStringData = await fs.readFileSync(
        'test/data/fixtures/sample/index.manuscript-json'
      )
      const jsonData = JSON.parse(jsonStringData.toString())
      await controller.saveProject({
        headers: authorizationHeader(validJWTToken),
        params: { projectId: 'MPProject:abc' },
        user: { _id: 'validUserId' },
        body: { data: jsonData.data },
      })

      expect(containerService.upsertProjectModels).toHaveBeenCalled()
    })

    test('should fail if manuscriptsID is not provided', async () => {
      const controller: any = new ProjectController()
      const containerService = DIContainer.sharedContainer.containerService
      const manuscriptRepo: any = DIContainer.sharedContainer.manuscriptRepository
      manuscriptRepo.getById = jest.fn(() => undefined)
      containerService.upsertProjectModels = jest.fn(async () => Promise.resolve())
      ContainerService.userIdForSync = jest.fn((id) => id)
      const jsonStringData = await fs.readFileSync(
        'test/data/fixtures/sample/index.manuscript-json'
      )
      const obj = {
        elementType: 'p',
        contents: 'some content',
        paragraphStyle: 'MPParagraphStyle:339456D4-33B6-40EE-8B6F-80662870B3A7',
        placeholderInnerHTML: '',
        _id: 'MPParagraphElement:E51EFD7D-52FF-4B72-BF9C-B47F2989436F',
        objectType: 'MPParagraphElement',
      }
      const json = JSON.parse(jsonStringData.toString())
      json.data.push(obj)

      const req = {
        headers: authorizationHeader(validJWTToken),
        params: { projectId: 'MPProject:abc' },
        user: { _id: 'validUserId' },
        body: { data: json.data },
      }
      await expect(controller.saveProject(req)).rejects.toThrow(RecordNotFoundError)
    })

    test('should fail if docs contains multiple manuscriptsIDs', async () => {
      const controller: any = new ProjectController()
      const containerService = DIContainer.sharedContainer.containerService
      const manuscriptRepo: any = DIContainer.sharedContainer.manuscriptRepository
      manuscriptRepo.getById = jest.fn(() => undefined)
      containerService.upsertProjectModels = jest.fn(async () => Promise.resolve())
      ContainerService.userIdForSync = jest.fn((id) => id)
      const jsonStringData = await fs.readFileSync(
        'test/data/fixtures/sample/index.manuscript-json'
      )
      const obj = {
        elementType: 'p',
        contents: 'some content',
        paragraphStyle: 'MPParagraphStyle:339456D4-33B6-40EE-8B6F-80662870B3A7',
        placeholderInnerHTML: '',
        manuscriptID: validManuscript1._id,
        _id: 'MPParagraphElement:E51EFD7D-52FF-4B72-BF9C-B47F2989436F',
        objectType: 'MPParagraphElement',
      }
      const json = JSON.parse(jsonStringData.toString())
      json.data.push(obj)

      const req = {
        headers: authorizationHeader(validJWTToken),
        params: { projectId: 'MPProject:abc' },
        user: { _id: 'validUserId' },
        body: { data: json.data },
      }
      await expect(controller.saveProject(req)).rejects.toThrow(ValidationError)
    })

    test('should fail projectId must be provided', async () => {
      const controller: any = new ProjectController()
      controller.upsertManuscriptToProject = jest.fn(async () => Promise.resolve())
      const manuscriptRepo: any = DIContainer.sharedContainer.manuscriptRepository
      manuscriptRepo.getById = jest.fn(() => validManuscript1)
      const jsonStringData = fs.readFileSync('test/data/fixtures/sample/index.manuscript-json')
      const jsonData = JSON.parse(jsonStringData.toString())
      await expect(
        controller.saveProject({
          headers: authorizationHeader(chance.string()),
          params: {},
          file: { path: 'test/data/fixtures/sample/index.manuscript-json-dup' },
          user: { _id: 'validUserId' },
          body: { data: jsonData.data },
        })
      ).rejects.toThrow(ValidationError)
    })

    test('should fail invalid credentials', async () => {
      const controller: any = new ProjectController()
      controller.upsertManuscriptToProject = jest.fn(async () => Promise.resolve())
      const manuscriptRepo: any = DIContainer.sharedContainer.manuscriptRepository
      manuscriptRepo.getById = jest.fn(() => validManuscript1)
      ContainerService.userIdForSync = jest.fn((id) => id)
      const jsonStringData = fs.readFileSync('test/data/fixtures/sample/index.manuscript-json')
      const jsonData = JSON.parse(jsonStringData.toString())
      await expect(
        controller.saveProject({
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
          file: { path: 'test/data/fixtures/sample/index.manuscript-json-dup' },
          user: { _id: 'validUserId' },
          body: { data: jsonData.data },
        })
      ).rejects.toThrow(InvalidCredentialsError)
    })
  })
  describe('upsertManuscriptToProject', () => {
    test('should fail if template not found', async () => {
      const controller: any = new ProjectController()

      DIContainer.sharedContainer.containerService.upsertProjectModels = jest.fn(async () => {
        return { _id: 'someValue' }
      })
      DIContainer.sharedContainer.manuscriptRepository.create = jest.fn()
      DIContainer.sharedContainer.templateRepository.getById = jest.fn(() => Promise.resolve(null))
      ContainerService.userIdForSync = jest.fn(() => 'User_foo')
      DIContainer.sharedContainer.pressroomService.validateTemplateId = jest.fn(() =>
        Promise.resolve(false)
      )
      const json = {
        data: [
          { _id: 'MPManuscript:abc', objectType: 'MPManuscript' },
          { _id: 'MPCitation:abc', objectType: 'MPCitation' },
          { _id: 'MPMPAuxiliaryObjectReference:abc', objectType: 'MPAuxiliaryObjectReference' },
        ],
      }

      await expect(
        controller.upsertManuscriptToProject(
          { _id: 'MPProject:abc' },
          json,
          null,
          'User|foo',
          null,
          'templateId'
        )
      ).rejects.toThrow(MissingTemplateError)
    })

    test('should not fail if template is found in pressroom', async () => {
      const controller: any = new ProjectController()

      DIContainer.sharedContainer.containerService.upsertProjectModels = jest.fn(async () =>
        Promise.resolve()
      )
      DIContainer.sharedContainer.manuscriptRepository.create = jest.fn()
      ContainerService.userIdForSync = jest.fn(() => 'User_foo')
      DIContainer.sharedContainer.templateRepository.getById = jest.fn(() => Promise.resolve(null))
      DIContainer.sharedContainer.pressroomService.validateTemplateId = jest.fn(() =>
        Promise.resolve(true)
      )
      const json = {
        data: [
          { _id: 'MPManuscript:abc', objectType: 'MPManuscript' },
          { _id: 'MPCitation:abc', objectType: 'MPCitation' },
          { _id: 'MPMPAuxiliaryObjectReference:abc', objectType: 'MPAuxiliaryObjectReference' },
        ],
      }
      await controller.upsertManuscriptToProject(
        { _id: 'MPProject:abc' },
        json,
        null,
        'User|foo',
        null,
        'templateId'
      )

      expect(DIContainer.sharedContainer.manuscriptRepository.create).toHaveBeenCalled()
      expect(DIContainer.sharedContainer.containerService.upsertProjectModels).toHaveBeenCalled()
    })

    test('successfully create a mansucript and all contained resources', async () => {
      const controller: any = new ProjectController()

      DIContainer.sharedContainer.containerService.upsertProjectModels = jest.fn(async () =>
        Promise.resolve()
      )
      DIContainer.sharedContainer.manuscriptRepository.create = jest.fn()
      DIContainer.sharedContainer.pressroomService.validateTemplateId = jest.fn(() =>
        Promise.resolve(false)
      )

      const json = {
        data: [
          { _id: 'MPManuscript:abc', objectType: 'MPManuscript' },
          { _id: 'MPCitation:abc', objectType: 'MPCitation' },
          { _id: 'MPMPAuxiliaryObjectReference:abc', objectType: 'MPAuxiliaryObjectReference' },
        ],
      }

      await controller.upsertManuscriptToProject({ _id: 'MPProject:abc' }, json)

      expect(DIContainer.sharedContainer.manuscriptRepository.create).toHaveBeenCalled()
      expect(DIContainer.sharedContainer.containerService.upsertProjectModels).toHaveBeenCalled()
    })

    test('successfully update the manuscript when the manuscriptId is provided and create all contained resources', async () => {
      const controller: any = new ProjectController()

      DIContainer.sharedContainer.containerService.upsertProjectModels = jest.fn(async () =>
        Promise.resolve()
      )
      DIContainer.sharedContainer.manuscriptRepository.patch = jest.fn()

      const json = {
        data: [
          { _id: 'MPManuscript:abc', objectType: 'MPManuscript' },
          { _id: 'MPCitation:abc', objectType: 'MPCitation' },
          { _id: 'MPMPAuxiliaryObjectReference:abc', objectType: 'MPAuxiliaryObjectReference' },
        ],
      }

      await controller.upsertManuscriptToProject(
        { _id: 'MPProject:abc' },
        json,
        null,
        'User|foo',
        'MPManuscript:foo-bar-baz'
      )

      expect(DIContainer.sharedContainer.manuscriptRepository.patch).toHaveBeenCalled()
      expect(DIContainer.sharedContainer.containerService.upsertProjectModels).toHaveBeenCalled()
    })
  })

  describe('collaborators', () => {
    test('should get collaborators', async () => {
      const controller: any = new ProjectController()
      ContainerService.userIdForSync = jest.fn((id) => id)
      DIContainer.sharedContainer.containerService.checkUserContainerAccess = jest.fn(
        async () => true
      )
      DIContainer.sharedContainer.userCollaboratorRepository.getByContainerId = jest.fn(
        (_id: string) => ['foo'] as any
      )
      const collaborators = await controller.collaborators({
        headers: authorizationHeader(validJWTToken),
        params: { projectId: 'MPProject:abc' },
      })

      expect(collaborators.length).toBeGreaterThan(0)
    })

    test('should fail projectId must be provided', async () => {
      const controller: any = new ProjectController()
      ContainerService.userIdForSync = jest.fn((id) => id)
      DIContainer.sharedContainer.containerService.checkUserContainerAccess = jest.fn(
        async () => true
      )
      DIContainer.sharedContainer.userCollaboratorRepository.getByContainerId = jest.fn(
        (_id: string) => ['foo'] as any
      )

      await expect(
        controller.collaborators({
          headers: authorizationHeader(validJWTToken),
          params: {},
        })
      ).rejects.toThrow(ValidationError)
    })

    test('should fail invalid credentials', async () => {
      const controller: any = new ProjectController()
      ContainerService.userIdForSync = jest.fn((id) => id)
      DIContainer.sharedContainer.containerService.checkUserContainerAccess = jest.fn(
        async () => true
      )
      DIContainer.sharedContainer.userCollaboratorRepository.getByContainerId = jest.fn(
        (_id: string) => ['foo'] as any
      )

      await expect(
        controller.collaborators({
          headers: authorizationHeader(chance.string()),
          params: { projectId: 'MPProject:abc' },
        })
      ).rejects.toThrow(InvalidCredentialsError)
    })

    test('should fail no access', async () => {
      const controller: any = new ProjectController()
      ContainerService.userIdForSync = jest.fn((id) => id)
      DIContainer.sharedContainer.containerService.checkUserContainerAccess = jest.fn(
        async () => false
      )
      DIContainer.sharedContainer.userCollaboratorRepository.getByContainerId = jest.fn(
        (_id: string) => ['foo'] as any
      )

      await expect(
        controller.collaborators({
          headers: authorizationHeader(validJWTToken),
          params: { projectId: 'MPProject:abc' },
        })
      ).rejects.toThrow(ValidationError)
    })
  })
  describe('projectReplace', () => {
    const json = {
      data: [
        { _id: 'MPManuscript:abc', objectType: 'MPManuscript' },
        { _id: 'MPCitation:abc', objectType: 'MPCitation' },
        { _id: 'MPMPAuxiliaryObjectReference:abc', objectType: 'MPAuxiliaryObjectReference' },
      ],
    }
    test('should fail if project id is not provided', async () => {
      const controller: any = new ProjectController()
      const req = {
        params: {
          manuscriptId: validManuscript1._id,
        },
        user: {
          _id: 'someId',
        },
        body: {
          data: json,
        },
      }
      await expect(controller.projectReplace(req)).rejects.toThrow(ValidationError)
    })
    test('should fail if manuscript id is not provided', async () => {
      const controller: any = new ProjectController()
      const req = {
        params: {
          projectId: validProject._id,
        },
        user: {
          _id: 'someId',
        },
        body: {
          data: json.data,
        },
      }
      await expect(controller.projectReplace(req)).rejects.toThrow(ValidationError)
    })
    test('should fail if user dont have access', async () => {
      const controller: any = new ProjectController()
      const service: any = DIContainer.sharedContainer.containerService
      service.checkIfCanEdit = jest.fn(() => false)
      const req = {
        params: {
          projectId: validProject._id,
          manuscriptId: validManuscript1._id,
        },
        user: {
          _id: 'someId',
        },
        body: {
          data: json.data,
        },
      }
      await expect(controller.projectReplace(req)).rejects.toThrow(RoleDoesNotPermitOperationError)
    })
    test('should fail if manuscript not found', async () => {
      const controller: any = new ProjectController()
      const service: any = DIContainer.sharedContainer.containerService
      const repo: any = DIContainer.sharedContainer.manuscriptRepository
      repo.getById = jest.fn(() => null)
      service.checkIfCanEdit = jest.fn(() => true)
      const req = {
        params: {
          projectId: validProject._id,
          manuscriptId: validManuscript1._id,
        },
        user: {
          _id: 'someId',
        },
        body: {
          data: json.data,
        },
      }
      await expect(controller.projectReplace(req)).rejects.toThrow(MissingManuscriptError)
    })
    test('removeAllResources & bulkInsert should be called', async () => {
      const controller: any = new ProjectController()
      const service: any = DIContainer.sharedContainer.containerService
      const manuscriptRepo: any = DIContainer.sharedContainer.manuscriptRepository
      const projectRepo: any = DIContainer.sharedContainer.projectRepository
      projectRepo.removeAllResources = jest.fn()
      projectRepo.removeWithAllResources = jest.fn()
      projectRepo.bulkInsert = jest.fn()
      manuscriptRepo.getById = jest.fn(() => validManuscript1)
      service.checkIfCanEdit = jest.fn(() => true)
      const req: any = {
        params: {
          projectId: validProject._id,
          manuscriptId: validManuscript1._id,
        },
        user: {
          _id: 'someId',
        },
        body: {
          data: json.data,
        },
      }
      await controller.projectReplace(req)
      expect(projectRepo.removeAllResources).toHaveBeenCalled()
      expect(projectRepo.bulkInsert).toHaveBeenCalled()
    })
  })

  describe('deleteModel', () => {
    const json = {
      data: [
        { _id: 'MPManuscript:abc', objectType: 'MPManuscript' },
        { _id: 'MPCitation:abc', objectType: 'MPCitation' },
        { _id: 'MPMPAuxiliaryObjectReference:abc', objectType: 'MPAuxiliaryObjectReference' },
      ],
    }
    test('should fail if project id is not provided', async () => {
      const controller: any = new ProjectController()
      const req = {
        params: {
          manuscriptId: validManuscript1._id,
        },
        user: {
          _id: 'someId',
        },
      }
      await expect(controller.deleteModel(req)).rejects.toThrow(ValidationError)
    })
    test('should fail if manuscript id is not provided', async () => {
      const controller: any = new ProjectController()
      const req = {
        params: {
          projectId: validProject._id,
        },
        user: {
          _id: 'someId',
        },
      }
      await expect(controller.deleteModel(req)).rejects.toThrow(ValidationError)
    })
    test('should fail if model id is not provided', async () => {
      const controller: any = new ProjectController()
      const req = {
        params: {
          projectId: validProject._id,
          manuscriptId: validManuscript1._id,
        },
        user: {
          _id: 'someId',
        },
      }
      await expect(controller.deleteModel(req)).rejects.toThrow(ValidationError)
    })
    test("should fail if user doesn't have access", async () => {
      const controller: any = new ProjectController()
      const service: any = DIContainer.sharedContainer.containerService
      service.checkIfCanEdit = jest.fn(() => false)
      const req = {
        params: {
          projectId: validProject._id,
          manuscriptId: validManuscript1._id,
          modelId: json.data[2]._id,
        },
        user: {
          _id: 'User_someId',
        },
      }
      await expect(controller.deleteModel(req)).rejects.toThrow(RoleDoesNotPermitOperationError)
    })
    test('should fail if manuscript not found', async () => {
      const controller: any = new ProjectController()
      const service: any = DIContainer.sharedContainer.containerService
      const repo: any = DIContainer.sharedContainer.manuscriptRepository
      repo.getById = jest.fn(() => null)
      service.checkIfCanEdit = jest.fn(() => true)
      const req = {
        params: {
          projectId: validProject._id,
          manuscriptId: validManuscript1._id,
          modelId: json.data[2]._id,
        },
        user: {
          _id: 'User_someId',
        },
      }
      await expect(controller.deleteModel(req)).rejects.toThrow(MissingManuscriptError)
    })
    test('should fail if model not found', async () => {
      const controller: any = new ProjectController()
      const service: any = DIContainer.sharedContainer.containerService
      const manuscriptRepo: any = DIContainer.sharedContainer.manuscriptRepository
      manuscriptRepo.getById = jest.fn(() => validManuscript1)
      const projectRepo: any = DIContainer.sharedContainer.projectRepository
      projectRepo.resourceExists = jest.fn(() => false)
      service.checkIfCanEdit = jest.fn(() => true)
      const req = {
        params: {
          projectId: validProject._id,
          manuscriptId: validManuscript1._id,
          modelId: 'MPNull',
        },
        user: {
          _id: 'User_someId',
        },
      }
      await expect(controller.deleteModel(req)).rejects.toThrow(MissingModelError)
    })
    test('removeResource should be called', async () => {
      const controller: any = new ProjectController()
      const service: any = DIContainer.sharedContainer.containerService
      const manuscriptRepo: any = DIContainer.sharedContainer.manuscriptRepository
      const projectRepo: any = DIContainer.sharedContainer.projectRepository
      projectRepo.removeResource = jest.fn()
      projectRepo.resourceExists = jest.fn(() => true)
      manuscriptRepo.getById = jest.fn(() => validManuscript1)
      service.checkIfCanEdit = jest.fn(() => true)
      const req: any = {
        params: {
          projectId: validProject._id,
          manuscriptId: validManuscript1._id,
          modelId: json.data[2]._id,
        },
        user: {
          _id: 'User_someId',
        },
      }
      await controller.deleteModel(req)
      expect(projectRepo.removeResource).toHaveBeenCalled()
    })
  })

  describe('ProjectController - manageUserRole', () => {
    test('should call manageUserRole()', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService
      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        body: {
          managedUserId: chance.string(),
          newRole: chance.string(),
        },
        params: {
          containerId: 'MPProject:foo',
        },
        user: validUser,
      }

      containerService.manageUserRole = jest.fn(() => {})

      const projectController: ProjectController = new ProjectController()
      await projectController.manageUserRole(req)

      return expect(containerService.manageUserRole).toHaveBeenCalled()
    })

    test('manageUserRole should fail if managedUserId is not a string', () => {
      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        body: {
          managedUserId: chance.integer(),
          newRole: chance.string(),
        },
        params: {
          containerId: 'MPProject:foo',
          containerType: 'project',
        },
        user: validUser,
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.manageUserRole(req)).rejects.toThrow(ValidationError)
    })

    test('manageUserRole should fail if containerId is not a string', () => {
      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        body: {
          managedUserId: chance.string(),
          newRole: chance.string(),
        },
        params: {
          containerId: 123,
          containerType: 'project',
        },
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.manageUserRole(req)).rejects.toThrow(ValidationError)
    })

    test('manageUserRole should fail if newRole is not a string', () => {
      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        body: {
          managedUserId: chance.string(),
          newRole: chance.integer(),
        },
        params: {
          containerId: 'MPProject:foo',
          containerType: 'project',
        },
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.manageUserRole(req)).rejects.toThrow(ValidationError)
    })

    test('manageUserRole should fail if secret is not a string', () => {
      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        body: {
          managedUserId: chance.string(),
          newRole: 'Viewer',
          secret: chance.integer(),
        },
        params: {
          containerId: 'MPProject:foo',
          containerType: 'project',
        },
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.manageUserRole(req)).rejects.toThrow(ValidationError)
    })
  })

  describe('ProjectController - addUser', () => {
    test('should call addUser()', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService

      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        body: {
          userId: chance.string(),
          role: chance.string(),
        },
        params: {
          projectId: 'MPProject:foo',
          containerType: 'project',
        },
        user: validUser,
      }

      containerService.addContainerUser = jest.fn(() => {})

      const projectController: ProjectController = new ProjectController()
      await projectController.addUser(req)

      return expect(containerService.addContainerUser).toHaveBeenCalled()
    })

    test('addUser should fail if userId is not a string', () => {
      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        body: {
          userId: chance.integer(),
          role: chance.string(),
        },
        params: {
          projectId: 'MPProject:foo',
        },
        user: validUser,
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.addUser(req)).rejects.toThrow(ValidationError)
    })

    test('addUser should fail if containerId is not a string', () => {
      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        body: {
          userId: chance.string(),
          role: chance.string(),
        },
        params: {
          projectId: 123,
          containerType: 'project',
        },
        user: validUser,
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.addUser(req)).rejects.toThrow(ValidationError)
    })

    test('addUser should fail if role is not a string', () => {
      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        body: {
          userId: chance.string(),
          role: chance.integer(),
        },
        params: {
          projectId: 'MPProject:foo',
          containerType: 'project',
        },
        user: validUser,
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.addUser(req)).rejects.toThrow(ValidationError)
    })
  })

  describe('ProjectController - delete', () => {
    test('should call deleteContainer()', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService

      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        params: {
          containerId: 'MPProject:foo',
        },
        user: validUser,
      }

      containerService.deleteContainer = jest.fn(() => {})

      const projectController: ProjectController = new ProjectController()
      await projectController.delete(req)

      return expect(containerService.deleteContainer).toHaveBeenCalled()
    })

    test('delete should fail if containerId is not a string', () => {
      const chance = new Chance()
      const req: any = {
        headers: authorizationHeader(chance.string()),
        params: {
          containerId: chance.integer(),
        },
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.delete(req)).rejects.toThrow(ValidationError)
    })
  })

  describe('ProjectController - getArchive', () => {
    test('should fail if the projectId is not a string', () => {
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: chance.integer(),
        },
        headers: {
          accept: chance.string(),
        },
        query: {},
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.getArchive(req)).rejects.toThrow(ValidationError)
    })

    test('should call getArchive()', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: 'MPProject:foo',
        },
        headers: {
          accept: chance.string(),
          authorization: 'Bearer ' + chance.string(),
        },
        user: {
          _id: chance.integer(),
        },
        query: {},
      }

      containerService.getArchive = jest.fn(() => {})

      const projectController: ProjectController = new ProjectController()
      await projectController.getArchive(req)

      return expect(containerService.getArchive).toHaveBeenCalled()
    })

    test('should call getArchive() for a specific manuscriptID', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: 'MPProject:foo',
          manuscriptId: 'MPProject:foo',
        },
        headers: {
          accept: chance.string(),
          authorization: 'Bearer ' + chance.string(),
        },
        user: {
          _id: chance.integer(),
        },
        query: {},
      }

      containerService.getArchive = jest.fn(() => {})

      const projectController: ProjectController = new ProjectController()
      await projectController.getArchive(req)

      return expect(containerService.getArchive).toHaveBeenCalled()
    })
  })

  describe('ProjectController - loadProject', () => {
    test('should call loadProject()', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: 'MPProject:foo',
        },
        headers: {
          accept: chance.string(),
          authorization: 'Bearer ' + chance.string(),
        },
        user: {
          _id: chance.integer(),
        },
        body: {},
        query: {},
      }

      containerService.loadProject = jest.fn(() => Promise.resolve())
      containerService.getContainer = jest.fn(() => Promise.resolve({ _id: 'someId' }))

      const projectController: ProjectController = new ProjectController()
      await projectController.loadProject(req)

      return expect(containerService.loadProject).toHaveBeenCalled()
    })

    test('should fail to loadProject if projectId is not provided', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: null,
        },
        headers: {
          accept: chance.string(),
          authorization: 'Bearer ' + chance.string(),
        },
        user: {
          _id: chance.integer(),
        },
        body: {},
        query: {},
      }

      containerService.loadProject = jest.fn(() => Promise.resolve())
      containerService.getContainer = jest.fn(() => Promise.resolve({ _id: 'someId' }))

      const projectController: ProjectController = new ProjectController()
      await expect(projectController.loadProject(req)).rejects.toThrow(ValidationError)
    })
    test('should return NOT_MODIFIED', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: 'MPProject:foo',
        },
        headers: {
          accept: chance.string(),
          authorization: 'Bearer ' + chance.string(),
          'if-modified-since': new Date().toUTCString(),
        },
        user: {
          _id: chance.integer(),
        },
        body: {},
        query: {},
      }

      containerService.loadProject = jest.fn(() => Promise.resolve())
      containerService.getContainer = jest.fn(() => Promise.resolve({ updatedAt: 10 }))

      const projectController: ProjectController = new ProjectController()
      const res = await projectController.loadProject(req)
      expect(res.status).toBe(304)
    })
  })

  describe('ProjectController - accessToken', () => {
    test('should fail if containerId is not string', async () => {
      const req: any = {
        params: {
          containerId: 123,
          scope: 'foobar',
        },
        headers: {
          authorization: 'Bearer ' + new Chance().string(),
        },
        user: {
          _id: 'User_bar',
        },
      }

      const projectController = new ProjectController()
      return expect(projectController.accessToken(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if scope is not string', async () => {
      const req: any = {
        params: {
          containerId: 'MPProject:foobar',
          scope: 123,
        },
        headers: {
          authorization: 'Bearer ' + new Chance().string(),
        },
        user: {
          _id: 'User_bar',
        },
      }

      const projectController = new ProjectController()
      return expect(projectController.accessToken(req)).rejects.toThrow(ValidationError)
    })

    test('should call accessToken', async () => {
      const req: any = {
        params: {
          containerId: 'MPProject:foobar',
          scope: 'foobar',
        },
        headers: {
          authorization: 'Bearer ' + new Chance().string(),
        },
        user: {
          _id: 'User_bar',
        },
      }

      const containersService = DIContainer.sharedContainer.containerService

      containersService.accessToken = jest.fn(async () => 'asdasd')

      const projectController = new ProjectController()
      await projectController.accessToken(req)

      return expect(containersService.accessToken).toHaveBeenCalledWith(
        req.user._id,
        req.params.scope,
        req.params.containerId
      )
    })
  })

  describe('ProjectController - jwksForAccessScope', () => {
    test('should fail because containerType should be a string', () => {
      const projectController = new ProjectController()

      const req: any = {
        params: {
          containerType: 123,
          scope: '',
        },
      }

      expect(() => projectController.jwksForAccessScope(req)).toThrow(ValidationError)
    })

    test('should fail because scope should be a string', () => {
      const projectController = new ProjectController()

      const req: any = {
        params: {
          scope: 123,
          containerType: '',
        },
      }

      expect(() => projectController.jwksForAccessScope(req)).toThrow(ValidationError)
    })

    test('should fail if publicKeyJWK is null', () => {
      const projectController = new ProjectController()
      const containerService: any = DIContainer.sharedContainer.containerService
      containerService.findScope = jest.fn(() => Promise.resolve({ publicKeyJWK: null }))
      const req: any = {
        params: {
          containerType: 123,
          scope: '',
        },
      }

      expect(() => projectController.jwksForAccessScope(req)).toThrow(ValidationError)
    })

    test('should return keys', () => {
      const projectController = new ProjectController()
      const stFn = jest.fn().mockReturnValue('true')
      ContainerService.findScope = stFn
      const req: any = {
        params: {
          containerType: '123',
          scope: 'scope',
        },
      }
      const res = projectController.jwksForAccessScope(req)
      expect(res).toBeTruthy()
    })
  })

  describe('ProjectController - getBundle', () => {
    test('should fail if the containerId is not a string', () => {
      const chance = new Chance()
      const req: any = {
        params: {
          containerId: chance.integer(),
        },
        headers: {
          accept: chance.string(),
        },
        query: {},
      }

      const projectController: ProjectController = new ProjectController()
      const finish = jest.fn()
      return expect(projectController.getBundle(req, finish)).rejects.toThrow(ValidationError)
    })

    test('should fail if user is not a collaborator', () => {
      const containerService = DIContainer.sharedContainer.containerService
      containerService.getContainer = jest.fn(async (): Promise<any> => validProject)
      const chance = new Chance()
      const req: any = {
        params: {
          containerId: 'MPProject:valid-project-id',
          manuscriptId: 'MPManuscript:valid-manuscript-id-1',
        },
        headers: {
          accept: chance.string(),
        },
        query: {},
        user: {
          _id: 'User_invalid',
        },
      }

      const projectController: ProjectController = new ProjectController()
      const finish = jest.fn()
      return expect(projectController.getBundle(req, finish)).rejects.toThrow(ValidationError)
    })

    test('should fail if the manuscriptId is not a string', () => {
      const containerService = DIContainer.sharedContainer.containerService
      containerService.getContainer = jest.fn(async (): Promise<any> => validProject)
      const chance = new Chance()
      const req: any = {
        params: {
          containerId: 'MPProject:valid-project-id',
          manuscriptId: chance.integer(),
        },
        headers: {
          accept: chance.string(),
          authorization: `Bearer ${validJWTToken}`,
        },
        query: {},
        user: {
          _id: 'User_test',
        },
      }

      const projectController: ProjectController = new ProjectController()
      const finish = jest.fn()
      return expect(projectController.getBundle(req, finish)).rejects.toThrow(ValidationError)
    })

    test('should call getBundle', async () => {
      const containerService: any = DIContainer.sharedContainer.containerService
      const pressroomService = DIContainer.sharedContainer.pressroomService

      containerService.getContainer = jest.fn(async (): Promise<any> => validProject)
      containerService.containerRepository.getById = jest.fn(async (): Promise<any> => validProject)
      DIContainer.sharedContainer.userService.authenticateUser = () => Promise.resolve()
      pressroomService.fetchHtml = jest.fn(async (): Promise<any> => Buffer.from('someData'))

      const chance = new Chance()
      const req: any = {
        params: {
          containerId: 'MPProject:valid-project-id',
          manuscriptId: 'MPManuscript:valid-manuscript-id-1',
        },
        headers: {
          accept: chance.string(),
          authorization: `Bearer ${validJWTToken}`,
        },
        query: {},
        user: {
          _id: 'User_test',
        },
      }

      const projectController: ProjectController = new ProjectController()
      const finish = jest.fn()
      await projectController.getBundle(req, finish)
      return expect(finish).toHaveBeenCalled()
    })
  })

  describe('ProjectController - getAttachment', () => {
    test('should fail if the id is not a string', () => {
      const chance = new Chance()
      const req: any = {
        params: {
          id: chance.integer(),
          attachmentKey: chance.string(),
        },
        user: {
          _id: 'invalidUser',
        },
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.getAttachment(req)).rejects.toThrow(ValidationError)
    })

    test('should call getAttachment', () => {
      const containerService: any = DIContainer.sharedContainer.containerService

      containerService.containerRepository = {
        getById: async () => {
          return Promise.resolve({
            _id: 'MPFigure:12345',
            containerID: 'MPProject',
            viewers: [],
            owners: ['User_test'],
            writers: [],
            _attachments: {
              image: {
                content_type: 'image/png',
              },
            },
          })
        },
        getAttachmentBody: async () => Promise.resolve('body'),
      }

      const chance = new Chance()
      const req: any = {
        params: {
          id: chance.string(),
          attachmentKey: 'image',
        },
        user: {
          _id: 'User_test',
        },
      }

      const projectController: ProjectController = new ProjectController()
      return expect(projectController.getAttachment(req)).resolves.toBeTruthy()
    })
  })

  describe('ProjectController - getProductionNotes', () => {
    test('should fail if projectId is not a string', async () => {
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: chance.integer(),
        },
      }
      const projectController: ProjectController = new ProjectController()
      await expect(projectController.getProductionNotes(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if manuscriptId is not a string', async () => {
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: chance.string(),
          manuscriptId: chance.integer(),
        },
      }
      const projectController: ProjectController = new ProjectController()
      await expect(projectController.getProductionNotes(req)).rejects.toThrow(ValidationError)
    })

    test('should  call getProductionNotes', async () => {
      const containerService = DIContainer.sharedContainer.containerService
      containerService.getProductionNotes = jest.fn()
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: `MPProject:${chance.string()}`,
          manuscriptId: chance.string(),
        },
        user: {
          _id: chance.string(),
        },
      }
      const projectController: ProjectController = new ProjectController()
      await projectController.getProductionNotes(req)
      expect(containerService.getProductionNotes).toHaveBeenCalled()
    })
  })

  describe('ProjectController - createManuscript', () => {
    test('should fail if projectId is not a string', async () => {
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: chance.integer(),
        },
        body: {},
      }
      const projectController: ProjectController = new ProjectController()
      await expect(projectController.createManuscript(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if projectId is not a string1', async () => {
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: chance.string(),
        },
        body: {
          templateId: chance.integer(),
        },
      }
      const projectController: ProjectController = new ProjectController()
      await expect(projectController.createManuscript(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if manuscriptId is not a string', async () => {
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: chance.string(),
          manuscriptId: chance.integer(),
        },
        body: {},
      }
      const projectController: ProjectController = new ProjectController()
      await expect(projectController.createManuscript(req)).rejects.toThrow(ValidationError)
    })

    test('should succeed to call createManuscript', async () => {
      const containerService = DIContainer.sharedContainer.containerService
      containerService.createManuscript = jest.fn()
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: `MPProject:${chance.string()}`,
          manuscriptId: chance.string(),
        },
        user: {
          _id: chance.string(),
        },
        body: {},
      }
      const projectController: ProjectController = new ProjectController()
      await projectController.createManuscript(req)
      expect(containerService.createManuscript).toHaveBeenCalled()
    })
  })

  describe('ProjectController - addProductionNote', () => {
    test('should fail if projectId is not a string', async () => {
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: chance.integer(),
        },
        body: {
          content: chance.integer(),
          connectUserId: 'valid-connect-user-6-id',
          source: 'DASHBOARD',
        },
        user: {
          _id: chance.string(),
        },
      }
      const projectController: ProjectController = new ProjectController()
      await expect(projectController.addProductionNote(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if manuscriptId is not a string', async () => {
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: chance.string(),
          manuscriptId: chance.integer(),
        },
        body: {
          content: chance.integer(),
          connectUserId: 'valid-connect-user-6-id',
          source: 'DASHBOARD',
        },
        user: {
          _id: chance.string(),
        },
      }
      const projectController: ProjectController = new ProjectController()
      await expect(projectController.addProductionNote(req)).rejects.toThrow(ValidationError)
    })

    test('should fail if content is not a string', async () => {
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: chance.string(),
          manuscriptId: chance.string(),
        },
        body: {
          content: chance.integer(),
          connectUserId: 'valid-connect-user-6-id',
          source: 'DASHBOARD',
        },
        user: {
          _id: chance.string(),
        },
      }
      const projectController: ProjectController = new ProjectController()
      await expect(projectController.addProductionNote(req)).rejects.toThrow(ValidationError)
    })

    test('should to call addProductionNote', async () => {
      const containerService = DIContainer.sharedContainer.containerService
      UserService.profileID = jest.fn()
      containerService.createManuscriptNote = jest.fn()
      const chance = new Chance()
      const req: any = {
        params: {
          projectId: `MPProject:${chance.string()}`,
          manuscriptId: chance.string(),
        },
        body: {
          content: 'asdasdasdasd',
          connectUserId: 'valid-connect-user-6-id',
          source: 'DASHBOARD',
        },
        user: {
          _id: 'User_test',
        },
      }
      const projectController: ProjectController = new ProjectController()
      await projectController.addProductionNote(req)
      expect(containerService.createManuscriptNote).toHaveBeenCalled()
    })
  })
})
