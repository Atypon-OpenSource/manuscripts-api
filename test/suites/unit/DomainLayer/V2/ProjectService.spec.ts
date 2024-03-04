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
import '../../../../utilities/dbMock.ts'
import '../../../../utilities/configMock.ts'

import { ObjectTypes } from '@manuscripts/json-schema'
import jwt from 'jsonwebtoken'
import { v4 as uuid_v4 } from 'uuid'

import { config } from '../../../../../src/Config/Config'
import { IManuscriptRepository } from '../../../../../src/DataAccess/Interfaces/IManuscriptRepository'
import { ProjectRepository } from '../../../../../src/DataAccess/ProjectRepository/ProjectRepository'
import { UserRepository } from '../../../../../src/DataAccess/UserRepository/UserRepository'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { ConfigService } from '../../../../../src/DomainServices/ConfigService'
import { ProjectPermission, ProjectService } from '../../../../../src/DomainServices/ProjectService'
import {
  InvalidScopeNameError,
  MissingContainerError,
  MissingTemplateError,
  SyncError,
  UserRoleError,
  ValidationError,
} from '../../../../../src/Errors'
import { ProjectUserRole } from '../../../../../src/Models/ContainerModels'
import { templates } from '../../../../data/dump/templates'
import { validManuscript, validManuscript1 } from '../../../../data/fixtures/manuscripts'
import { validProject, validProject2 } from '../../../../data/fixtures/projects'
import { validUser2 } from '../../../../data/fixtures/UserRepository'
import { validUser } from '../../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let projectService: ProjectService
let containerRepository: ProjectRepository
let manuscriptRepository: IManuscriptRepository
let projectRepository: ProjectRepository
let configService: ConfigService
let userRepository: UserRepository
beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  projectService = DIContainer.sharedContainer.projectService
  containerRepository = DIContainer.sharedContainer.projectRepository
  manuscriptRepository = DIContainer.sharedContainer.manuscriptRepository
  projectRepository = DIContainer.sharedContainer.projectRepository
  configService = DIContainer.sharedContainer.configService
  // @ts-ignore
  userRepository = DIContainer.sharedContainer.userRepository
})
afterEach(() => {
  jest.clearAllMocks()
})
jest.mock('uuid')
const JSZip = require('jszip')

describe('projectService', () => {
  const projectID = validProject._id
  const manuscriptID = validManuscript._id
  const userID = validUser._id
  const templateID = templates[0]._id
  describe('createProject', () => {
    it('should create a new project without ID and title', async () => {
      containerRepository.create = jest.fn().mockResolvedValue({})
      await expect(projectService.createProject(userID)).resolves.not.toThrow()
      expect(uuid_v4).toHaveBeenCalled()
      expect(containerRepository.create).toHaveBeenCalled()
    })
  })
  describe('createManuscript', () => {
    it('should create a new manuscript', async () => {
      manuscriptRepository.create = jest.fn().mockResolvedValue({})
      await projectService.createManuscript(projectID)
      expect(uuid_v4).toHaveBeenCalled()
    })
    it('should create a new manuscript with the provided templateID', async () => {
      const expectedManuscript = {
        objectType: ObjectTypes.Manuscript,
        containerID: projectID,
        prototype: templateID,
      }

      configService.hasDocument = jest.fn().mockResolvedValue(true)
      manuscriptRepository.create = jest.fn().mockResolvedValue(expectedManuscript)

      const result = await projectService.createManuscript(projectID, templateID)

      expect(result).toEqual(expectedManuscript)
      expect(configService.hasDocument).toHaveBeenCalledWith(templateID)
      expect(manuscriptRepository.create).toHaveBeenCalledWith(expectedManuscript)
    })

    it('should throw an error if the provided templateID does not exist', async () => {
      configService.hasDocument = jest.fn().mockResolvedValue(false)
      manuscriptRepository.create = jest.fn().mockResolvedValue(null)
      await expect(projectService.createManuscript(projectID, templateID)).rejects.toThrow(
        new MissingTemplateError(templateID)
      )
      expect(configService.hasDocument).toHaveBeenCalledWith(templateID)
      expect(manuscriptRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('importJats', () => {
    it('should throw an error if the provided templateID does not exist', async () => {
      const file = {}
      configService.hasDocument = jest.fn().mockResolvedValue(false)
      // @ts-ignore
      await expect(projectService.importJats(file, projectID, templateID)).rejects.toThrow(
        new MissingTemplateError(templateID)
      )
      expect(configService.hasDocument).toHaveBeenCalledWith(templateID)
    })

    it('should succeed if called correctly', async () => {
      const file = {}
      const manuscript = {
        _id: 'MPManuscript:test-manuscript',
        objectType: ObjectTypes.Manuscript,
      }
      const paragraph = {
        _id: 'MPParagraphElement:test-paragraph',
        objectType: ObjectTypes.ParagraphElement,
        contents: 'Test paragraph',
        elementType: 'p',
      }
      const data = [manuscript, paragraph]
      configService.hasDocument = jest.fn().mockResolvedValue(true)
      projectRepository.bulkInsert = jest.fn(async () => Promise.resolve())
      // @ts-ignore
      projectService.convert = jest.fn(async (): Promise<any> => Promise.resolve())
      // @ts-ignore
      projectService.extract = jest.fn(
        async (): Promise<any> =>
          Promise.resolve({
            root: '',
            files: {
              'index.manuscript-json': {
                data: `{"data": ${JSON.stringify(data)}}`,
              },
            },
          })
      )
      // @ts-ignore
      const output = await projectService.importJats(file, projectID, templateID)

      expect(output._id).toEqual(manuscript._id)
      expect(output.containerID).toEqual(projectID)
      expect(output.prototype).toEqual(templateID)
      expect(output.updatedAt).not.toBeNull()
      expect(output.createdAt).not.toBeNull()
    })
    it('should fail if index json does not exist', async () => {
      const file = {}
      configService.hasDocument = jest.fn().mockResolvedValue(true)
      // @ts-ignore
      projectService.convert = jest.fn(async (): Promise<any> => Promise.resolve())
      // @ts-ignore
      projectService.extract = jest.fn(
        async (): Promise<any> =>
          Promise.resolve({
            root: '',
            files: {
              'test.json': {
                data: '',
              },
            },
          })
      )
      // @ts-ignore
      await expect(projectService.importJats(file, projectID, templateID)).rejects.toThrow(
        ValidationError
      )
    })
    it('should fail if no Manuscript is found', async () => {
      const file = {}
      const paragraph = {
        _id: 'MPParagraphElement:test-paragraph',
        objectType: ObjectTypes.ParagraphElement,
        contents: 'Test paragraph',
      }
      const data = [paragraph]
      configService.hasDocument = jest.fn().mockResolvedValue(true)
      // @ts-ignore
      projectService.convert = jest.fn(async (): Promise<any> => Promise.resolve())
      // @ts-ignore
      projectService.extract = jest.fn(
        async (): Promise<any> =>
          Promise.resolve({
            root: '',
            files: {
              'index.manuscript-json': {
                data: `{"data": ${JSON.stringify(data)}}`,
              },
            },
          })
      )
      // @ts-ignore
      await expect(projectService.importJats(file, projectID, templateID)).rejects.toThrow(
        ValidationError
      )
    })
    it('should fail if invalid model is used', async () => {
      const file = {}
      const manuscript = {
        _id: 'MPManuscript:test-manuscript',
        objectType: ObjectTypes.Manuscript,
      }
      const paragraph = {
        _id: 'MPParagraphElement:test-paragraph',
        objectType: ObjectTypes.ParagraphElement,
        contents: 'Test paragraph',
      }
      const data = [manuscript, paragraph]
      configService.hasDocument = jest.fn().mockResolvedValue(true)
      // @ts-ignore
      projectService.convert = jest.fn(async (): Promise<any> => Promise.resolve())
      // @ts-ignore
      projectService.extract = jest.fn(
        async (): Promise<any> =>
          Promise.resolve({
            root: '',
            files: {
              'index.manuscript-json': {
                data: `{"data": ${JSON.stringify(data)}}`,
              },
            },
          })
      )
      // @ts-ignore
      await expect(projectService.importJats(file, projectID, templateID)).rejects.toThrow(
        SyncError
      )
    })
  })

  describe('getProject', () => {
    it('should throw an error if the project does not exist', async () => {
      containerRepository.getById = jest.fn().mockResolvedValue(null)
      await expect(projectService.getProject(projectID)).rejects.toThrow(
        new MissingContainerError('null')
      )
    })
    it('should return a project if the project exists', async () => {
      containerRepository.getById = jest.fn().mockResolvedValue(validProject)
      const project = await projectService.getProject(projectID)
      expect(project).toEqual(validProject)
    })
  })

  describe('updateProject', () => {
    it('should throw an error if invalid containerID', async () => {
      const models = [
        {
          containerID: validProject2._id,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        new ValidationError('problem with containerID', models)
      )
    })
    it('should throw an error if data contains multiple manuscriptIDs', async () => {
      const models = [
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: projectID,
          manuscriptID: validManuscript1._id,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        new ValidationError('contains multiple manuscriptIDs', models)
      )
    })
    it('should throw an error if manuscript does not exist', async () => {
      const models = [
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      manuscriptRepository.getById = jest.fn().mockResolvedValue(null)
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        new ValidationError("manuscript doesn't exist", models)
      )
    })
    it('should throw an error if manuscript does not belong to project', async () => {
      const models = [
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      manuscriptRepository.getById = jest.fn().mockResolvedValue({ containerID: manuscriptID })
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        new ValidationError("manuscript doesn't belong to project", models)
      )
    })
    it('should update project if manuscript belongs to project, manuscript exists, no multiple manuscriptIDs and a valid containerID', async () => {
      const models = [
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      manuscriptRepository.getById = jest.fn().mockResolvedValue({ containerID: projectID })
      containerRepository.bulkUpsert = jest.fn().mockResolvedValue({})
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).resolves.not.toThrow()
    })
  })
  describe('updateUserRole', () => {
    it('should throw an error if invalid userID', async () => {
      projectService.getProject = jest.fn().mockResolvedValue(validProject)
      userRepository.getOne = jest.fn().mockResolvedValue(null)
      await expect(
        projectService.updateUserRole(projectID, userID, ProjectUserRole.Writer)
      ).rejects.toThrow(new ValidationError('Invalid user id', null))
    })
    it('should throw an error if user is * and new role is Writer', async () => {
      projectService.getProject = jest.fn().mockResolvedValue(validProject)
      userRepository.getOne = jest.fn().mockResolvedValue({ _id: '*' })
      await expect(
        projectService.updateUserRole(projectID, userID, ProjectUserRole.Writer)
      ).rejects.toThrow(new ValidationError('User can not be owner or writer', '*'))
    })
    it('should throw an error if user is * and new role is Owner', async () => {
      projectService.getProject = jest.fn().mockResolvedValue(validProject)
      userRepository.getOne = jest.fn().mockResolvedValue({ _id: '*' })
      await expect(
        projectService.updateUserRole(projectID, userID, ProjectUserRole.Owner)
      ).rejects.toThrow(new ValidationError('User can not be owner or writer', '*'))
    })
    it('should throw an error if user is the only Owner', async () => {
      const project = {
        owners: [userID],
        writers: [],
        viewers: [],
        editors: [],
        annotators: [],
      }
      projectService.getProject = jest.fn().mockResolvedValue(project)
      userRepository.getOne = jest.fn().mockResolvedValue(validUser)
      await expect(
        projectService.updateUserRole(projectID, userID, ProjectUserRole.Owner)
      ).rejects.toThrow(new UserRoleError('User is the only owner', ProjectUserRole.Owner))
    })
    it('should update user role successfully', async () => {
      const project = {
        owners: [userID, validUser2._id],
        writers: [],
        viewers: [],
        editors: [],
        annotators: [],
      }
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const user = { _id: userID }
      userRepository.getOne = jest.fn().mockResolvedValue(user)
      containerRepository.patch = jest.fn().mockResolvedValue({})

      await projectService.updateUserRole(projectID, userID, ProjectUserRole.Writer)

      expect(projectService.getProject).toHaveBeenCalledTimes(1)
      expect(projectService.getProject).toHaveBeenCalledWith(projectID)

      expect(userRepository.getOne).toHaveBeenCalledTimes(1)
      expect(userRepository.getOne).toHaveBeenCalledWith({ connectUserID: userID })

      expect(containerRepository.patch).toHaveBeenCalledTimes(1)

      const userIdForSync = userID.replace('|', '_')
      expect(containerRepository.patch).toHaveBeenCalledWith(projectID, {
        _id: projectID,
        owners: [validUser2._id],
        writers: [userIdForSync],
        viewers: [],
        editors: [],
        annotators: [],
        proofers: [],
      })
    })
  })
  describe('generateAccessToken', () => {
    it('should generate access token successfully with valid scope', async () => {
      const scope = 'pressroom'
      const scopeInfo = {
        name: 'pressroom',
        publicKeyPEM: null,
        identifier: 'identifier',
        expiry: 30,
        secret: 'secret',
      }
      config.scopes.find = jest.fn().mockResolvedValue(scopeInfo)
      jwt.sign = jest.fn().mockResolvedValue('access_token')
      const result = await projectService.generateAccessToken(projectID, userID, scope)
      expect(config.scopes.find).toHaveBeenCalledTimes(1)
      expect(jwt.sign).toHaveBeenCalledTimes(1)
      expect(result).toBe('access_token')
    })

    it('should throw InvalidScopeNameError for invalid scope', async () => {
      const scope = 'invalidScope'

      // @ts-ignore
      jest.spyOn(config.scopes, 'find').mockReturnValue(null)

      await expect(projectService.generateAccessToken(projectID, userID, scope)).rejects.toThrow(
        new InvalidScopeNameError(scope)
      )
    })
  })
  describe('getPermissions', () => {
    it('should return all permissions when user is owner', async () => {
      const project = validProject
      project.owners = [userID]
      project.viewers = []
      project.writers = []
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(
        new Set([
          ProjectPermission.READ,
          ProjectPermission.UPDATE,
          ProjectPermission.DELETE,
          ProjectPermission.UPDATE_ROLES,
          ProjectPermission.CREATE_MANUSCRIPT,
        ])
      )
    })
    it('should return READ permission for non-owner viewers', async () => {
      const project = validProject
      project.owners = []
      project.viewers = [userID]
      project.writers = []
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set([ProjectPermission.READ]))
    })
    it('should return READ, UPDATE, and CREATE_MANUSCRIPT permissions for non-owner writers', async () => {
      const project = validProject
      project.owners = []
      project.viewers = []
      project.writers = [userID]
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(
        new Set([
          ProjectPermission.READ,
          ProjectPermission.UPDATE,
          ProjectPermission.CREATE_MANUSCRIPT,
        ])
      )
    })
    it('should give READ and UPDATE permissions for project editors', async () => {
      const project = validProject
      project.owners = []
      project.viewers = []
      project.writers = []
      project.editors = [userID]
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set([ProjectPermission.READ, ProjectPermission.UPDATE]))
    })
    it('should give READ and UPDATE permissions for project annotators', async () => {
      const project = validProject
      project.owners = []
      project.viewers = []
      project.writers = []
      project.annotators = [userID]
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set([ProjectPermission.READ, ProjectPermission.UPDATE]))
    })
    it('should return empty permissions for users who are not owners, writers, or viewers, and the project has no annotators or editors', async () => {
      const project = validProject
      project.owners = []
      project.viewers = []
      project.writers = []
      project.annotators = []
      project.editors = []
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set<ProjectPermission>())
    })
  })
  describe('makeArchive', () => {
    it('should generate an archive with index.manuscript-json file', async () => {
      containerRepository.getContainerResources = jest.fn().mockResolvedValue(validProject)
      const result = await projectService.makeArchive(projectID, undefined, {
        getAttachments: true,
        includeExt: true,
      })
      const zip = await JSZip.loadAsync(result)
      expect(Object.keys(zip.files).length).toBe(1)
      const content = await zip.files['index.manuscript-json'].async('text')
      const json = JSON.parse(content)
      expect(json.data._id).toBe(projectID)
      expect(result).toBeInstanceOf(Buffer)
    })
    it('should return only index.manuscript.json when getAttachments option is false', async () => {
      containerRepository.getContainerResources = jest.fn().mockResolvedValue(validProject)
      const result = await projectService.makeArchive(projectID, undefined, {
        getAttachments: false,
        includeExt: true,
      })

      expect(result).toBeInstanceOf(Buffer)
      const expectedResult = Buffer.from(JSON.stringify({ version: '2.0', data: validProject }))
      expect(result).toEqual(expectedResult)
    })

    it('should generate an archive with only resource IDs when onlyIDs option is true', async () => {
      const resourceIDs = ['resource1', 'resource2']
      containerRepository.getContainerResourcesIDs = jest.fn().mockResolvedValue(resourceIDs)

      const result = await projectService.makeArchive(projectID, undefined, {
        onlyIDs: true,
        includeExt: true,
        getAttachments: true,
      })

      const zip = await JSZip.loadAsync(result)
      const indexFile = await zip.file('index.manuscript-json').async('string')
      const index = JSON.parse(indexFile)

      expect(index.version).toBe('2.0')
      expect(index.data).toEqual(resourceIDs)
    })

    it('should return an archive with only index.manuscript-json file when no resources exist', async () => {
      const resources: any[] = []
      containerRepository.getContainerResources = jest.fn().mockResolvedValue(resources)
      const result = await projectService.makeArchive(projectID, undefined, {
        getAttachments: true,
        includeExt: true,
      })
      const zip = await JSZip.loadAsync(result)
      const files = Object.keys(zip.files)

      expect(files.length).toBe(1)
      expect(files[0]).toBe('index.manuscript-json')
    })
  })
})
