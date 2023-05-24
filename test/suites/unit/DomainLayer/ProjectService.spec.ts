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
import '../../../utilities/dbMock.ts'
import '../../../utilities/configMock.ts'

import { ObjectTypes } from '@manuscripts/json-schema'
import jwt from 'jsonwebtoken'
import { v4 as uuid_v4 } from 'uuid'

import { config } from '../../../../src/Config/Config'
import { IManuscriptRepository } from '../../../../src/DataAccess/Interfaces/IManuscriptRepository'
import { ProjectRepository } from '../../../../src/DataAccess/ProjectRepository/ProjectRepository'
import { TemplateRepository } from '../../../../src/DataAccess/TemplateRepository/TemplateRepository'
import { UserRepository } from '../../../../src/DataAccess/UserRepository/UserRepository'
import { DIContainer } from '../../../../src/DIContainer/DIContainer'
import { ProjectPermission, ProjectService } from '../../../../src/DomainServices/ProjectService'
import {
  ConflictingRecordError,
  InvalidScopeNameError,
  MissingContainerError,
  MissingTemplateError,
} from '../../../../src/Errors'
import { ProjectUserRole } from '../../../../src/Models/ContainerModels'
import { templates } from '../../../data/dump/templates'
import { validManuscript, validManuscript1 } from '../../../data/fixtures/manuscripts'
import { validProject } from '../../../data/fixtures/projects'
import { validUser2 } from '../../../data/fixtures/UserRepository'
import { validUser } from '../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let projectService: ProjectService
let containerRepository: ProjectRepository
let manuscriptRepository: IManuscriptRepository
let templateRepository: TemplateRepository
let userReposoitory: UserRepository
beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  projectService = DIContainer.sharedContainer.projectService
  containerRepository = DIContainer.sharedContainer.projectRepository
  manuscriptRepository = DIContainer.sharedContainer.manuscriptRepository
  templateRepository = DIContainer.sharedContainer.templateRepository
  // @ts-ignore
  userReposoitory = DIContainer.sharedContainer.userRepository
})
afterEach(() => {
  jest.clearAllMocks()
})
jest.mock('uuid')

describe('projectService', () => {
  const projectID = validProject._id
  const manuscriptID = validManuscript._id
  const userID = validUser._id
  const templateID = templates[0]._id
  describe('createProject', () => {
    it('should create a new project with the given ID and title', async () => {
      const expectedProject = {
        _id: projectID,
        objectType: ObjectTypes.Project,
        title: 'project',
        owners: [userID],
        writers: [],
        viewers: [],
      }
      containerRepository.create = jest.fn().mockResolvedValue(expectedProject)
      const project = await projectService.createProject(userID, projectID, 'project')
      expect(project).toEqual(expectedProject)
      expect(containerRepository.create).toHaveBeenCalledWith(expectedProject)
    })
    it('should create a new project without ID and title', async () => {
      containerRepository.create = jest.fn().mockResolvedValue({})
      await expect(projectService.createProject(userID)).resolves.not.toThrow()
      expect(uuid_v4).toHaveBeenCalled()
      expect(containerRepository.create).toHaveBeenCalled()
    })
  })
  describe('createManuscript', () => {
    it('should create a new manuscript with a generated ID if manuscriptID and template are not provided', async () => {
      manuscriptRepository.create = jest.fn().mockResolvedValue({})
      manuscriptRepository.getById = jest.fn().mockResolvedValue(null)
      await projectService.createManuscript(projectID)
      expect(manuscriptRepository.getById).not.toHaveBeenCalled()
      expect(uuid_v4).toHaveBeenCalled()
    })

    it('should create a new manuscript with the provided manuscriptID if it is not already taken', async () => {
      const expectedManuscript = {
        _id: manuscriptID,
        objectType: ObjectTypes.Manuscript,
        containerID: projectID,
        prototype: undefined,
      }
      manuscriptRepository.getById = jest.fn().mockResolvedValue(null)
      manuscriptRepository.create = jest.fn().mockResolvedValue(expectedManuscript)

      const result = await projectService.createManuscript(projectID, manuscriptID)

      expect(result).toEqual(expectedManuscript)
      expect(manuscriptRepository.getById).toHaveBeenCalledWith(manuscriptID)
      expect(manuscriptRepository.create).toHaveBeenCalledWith(expectedManuscript)
    })

    it('should throw an error if a manuscript with the same ID already exists', async () => {
      const existingManuscript = {
        _id: manuscriptID,
        objectType: ObjectTypes.Manuscript,
        containerID: projectID,
        prototype: undefined,
      }
      manuscriptRepository.getById = jest.fn().mockResolvedValue(existingManuscript)
      manuscriptRepository.create = jest.fn().mockResolvedValue({})
      await expect(projectService.createManuscript(projectID, manuscriptID)).rejects.toThrow(
        ConflictingRecordError
      )

      expect(manuscriptRepository.getById).toHaveBeenCalledWith(manuscriptID)
      expect(manuscriptRepository.create).not.toHaveBeenCalled()
    })

    it('should create a new manuscript with the provided templateID if it exists', async () => {
      const expectedManuscript = {
        _id: manuscriptID,
        objectType: ObjectTypes.Manuscript,
        containerID: projectID,
        prototype: templateID,
      }

      manuscriptRepository.getById = jest.fn().mockResolvedValue(null)
      templateRepository.getById = jest.fn().mockResolvedValue({ id: templateID })
      manuscriptRepository.create = jest.fn().mockResolvedValue(expectedManuscript)

      const result = await projectService.createManuscript(projectID, manuscriptID, templateID)

      expect(result).toEqual(expectedManuscript)
      expect(templateRepository.getById).toHaveBeenCalledWith(templateID)
      expect(manuscriptRepository.create).toHaveBeenCalledWith(expectedManuscript)
    })

    it('should throw an error if the provided templateID does not exist', async () => {
      templateRepository.getById = jest.fn().mockResolvedValue(null)
      manuscriptRepository.getById = jest.fn().mockResolvedValue(null)
      manuscriptRepository.create = jest.fn().mockResolvedValue(null)
      await expect(
        projectService.createManuscript(projectID, undefined, templateID)
      ).rejects.toThrow(MissingTemplateError)
      expect(manuscriptRepository.getById).not.toHaveBeenCalled()
      expect(templateRepository.getById).toHaveBeenCalledWith(templateID)
      expect(manuscriptRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('getProject', () => {
    it('should throw an error if the project does not exist', async () => {
      containerRepository.getById = jest.fn().mockResolvedValue(null)
      await expect(projectService.getProject(projectID)).rejects.toThrow(MissingContainerError)
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
          containerID: projectID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        'Validation error: problem with containerID'
      )
    })
    it('should throw an error if data contains multiple manuscriptIDs', async () => {
      const models = [
        {
          containerID: '321',
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: '123',
          manuscriptID: validManuscript1._id,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        'Validation error: contains multiple manuscriptIDs'
      )
    })
    it('should throw an error if manuscript does not exist', async () => {
      const models = [
        {
          containerID: '321',
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: '123',
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      manuscriptRepository.getById = jest.fn().mockResolvedValue(null)
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        "Validation error: manuscript doesn't exist"
      )
    })
    it('should throw an error if manuscript does not belong to project', async () => {
      const models = [
        {
          containerID: '321',
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: '123',
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      manuscriptRepository.getById = jest.fn().mockResolvedValue({ containerID: manuscriptID })
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        "Validation error: manuscript doesn't belong to project"
      )
    })
    it('should update project if manuscript belongs to project, manuscript exists, no multiple manuscriptIDs and a valid containerID', async () => {
      const models = [
        {
          containerID: '321',
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: '123',
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
      userReposoitory.getOne = jest.fn().mockResolvedValue(null)
      await expect(
        projectService.updateUserRole(projectID, userID, ProjectUserRole.Writer)
      ).rejects.toThrow('Validation error: Invalid user id')
    })
    it('should throw an error if user is * and new role is Writer', async () => {
      projectService.getProject = jest.fn().mockResolvedValue(validProject)
      userReposoitory.getOne = jest.fn().mockResolvedValue({ _id: '*' })
      await expect(
        projectService.updateUserRole(projectID, userID, ProjectUserRole.Writer)
      ).rejects.toThrow('Validation error: User can not be owner or writer')
    })
    it('should throw an error if user is * and new role is Owner', async () => {
      projectService.getProject = jest.fn().mockResolvedValue(validProject)
      userReposoitory.getOne = jest.fn().mockResolvedValue({ _id: '*' })
      await expect(
        projectService.updateUserRole(projectID, userID, ProjectUserRole.Owner)
      ).rejects.toThrow('Validation error: User can not be owner or writer')
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
      userReposoitory.getOne = jest.fn().mockResolvedValue(validUser)
      await expect(
        projectService.updateUserRole(projectID, userID, ProjectUserRole.Owner)
      ).rejects.toThrow('User is the only owner')
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
      userReposoitory.getOne = jest.fn().mockResolvedValue(user)
      containerRepository.patch = jest.fn().mockResolvedValue({})

      await projectService.updateUserRole(projectID, userID, ProjectUserRole.Writer)

      expect(projectService.getProject).toHaveBeenCalledTimes(1)
      expect(projectService.getProject).toHaveBeenCalledWith(projectID)

      expect(userReposoitory.getOne).toHaveBeenCalledTimes(1)
      expect(userReposoitory.getOne).toHaveBeenCalledWith({ connectUserID: userID })

      expect(containerRepository.patch).toHaveBeenCalledTimes(1)
      expect(containerRepository.patch).toHaveBeenCalledWith(projectID, {
        _id: projectID,
        owners: [validUser2._id],
        writers: [userID],
        viewers: [],
        editors: [],
        annotators: [],
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
    it('should return read permission when user is not owner but is viewer', async () => {
      const project = validProject
      project.owners = []
      project.viewers = [userID]
      project.writers = []
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set([ProjectPermission.READ]))
    })
    it('should return read, write, createManuscript permissions when user is not owner and is not viewer', async () => {
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
    it('should give read and update permissions when user is not owner, not writer, is not viewer and project has editors and user is one of them', async () => {
      const project = validProject
      project.owners = []
      project.viewers = []
      project.writers = []
      project.editors = [userID]
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set([ProjectPermission.READ, ProjectPermission.UPDATE]))
    })
    it('should give read and update permissions when user is not owner, not writer, is not viewer and project has annotators and user is one of them', async () => {
      const project = validProject
      project.owners = []
      project.viewers = []
      project.writers = []
      project.annotators = [userID]
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set([ProjectPermission.READ, ProjectPermission.UPDATE]))
    })
    it('should return empty permissions when user is not owner, not writer, is not viewer and project does not have annotators or editors', async () => {
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
  //todo test projectService.makeArchive
})
