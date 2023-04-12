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
import '../../../../../utilities/configMock'

import { Chance } from 'chance'
import fs from 'fs'
import tempy from 'tempy'

import { ProjectController } from '../../../../../../src/Controller/V1/Project/ProjectController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ContainerService } from '../../../../../../src/DomainServices/Container/ContainerService'
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
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

const testProjectId = 'testProjectId'

beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()

  DIContainer.sharedContainer.userService.profile = async (): Promise<any> => ({ userID: 'foo' })
  DIContainer.sharedContainer.pressroomService.importJATS = jest.fn(
    async (): Promise<any> => Promise.resolve()
  )

  const containerService: any = DIContainer.sharedContainer.containerService
  containerService.createContainer = jest.fn(async (): Promise<any> => ({ id: testProjectId }))
  containerService.updateContainer = jest.fn(async (): Promise<any> => Promise.resolve())
  containerService.getContainer = jest.fn(async (): Promise<any> => Promise.resolve())
})

const chance = new Chance()

describe('ProjectController', () => {
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
  })

  describe('add', () => {
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
})
