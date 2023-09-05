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

import { Model, ObjectTypes } from '@manuscripts/json-schema'

import { ProjectController } from '../../../../../../src/Controller/V2/Project/ProjectController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  ProjectPermission,
  ProjectService,
} from '../../../../../../src/DomainServices/ProjectService'
import { RoleDoesNotPermitOperationError } from '../../../../../../src/Errors'
import { ProjectUserRole } from '../../../../../../src/Models/ContainerModels'
import { templates } from '../../../../../data/dump/templates'
import { ValidHeaderWithApplicationKey } from '../../../../../data/fixtures/headers'
import { validManuscript } from '../../../../../data/fixtures/manuscripts'
import { validProject } from '../../../../../data/fixtures/projects'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let projectService: ProjectService
beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  projectService = DIContainer.sharedContainer.projectService
})
afterEach(() => {
  jest.clearAllMocks()
})

describe('ProjectController', () => {
  let controller: ProjectController
  const projectTitle = 'random_project_title'
  const projectID = validProject._id
  const user = validUser as Express.User
  const userID = user._id
  const role = ProjectUserRole.Owner
  const manuscriptID = validManuscript._id
  const templateID = templates[0]._id
  const onlyIDs = 'true'
  const accept = ValidHeaderWithApplicationKey['Accept']
  const scope = 'pressroom'
  const data: Model[] = [
    {
      _id: validProject._id,
      objectType: ObjectTypes.Project,
      createdAt: 20 / 12 / 2020,
      updatedAt: 21 / 12 / 2020,
    },
  ]
  beforeEach(() => {
    controller = new ProjectController()
  })
  describe('createProject', () => {
    it('should call projectService.createProject with correct parameters', async () => {
      const mockProject = { _id: '123', projectTitle: 'Test Project', owners: ['user1'] }

      projectService.createProject = jest.fn().mockResolvedValue(mockProject)

      const project = await controller.createProject(projectTitle, user, projectID)

      expect(projectService.createProject).toHaveBeenCalledWith(userID, projectID, projectTitle)
      expect(project).toEqual(mockProject)
    })
    it('should not throw an error if projectID is missing', async () => {
      await expect(controller.createProject(projectTitle, user)).resolves.not.toThrow()
    })
    it('should throw an error if ProjectService.createProject fails', async () => {
      projectService.createProject = jest.fn().mockRejectedValue(new Error('Test Error'))

      await expect(controller.createProject(projectTitle, user, projectID)).rejects.toThrow(
        'Test Error'
      )
    })
  })
  describe('updateProject', () => {
    it('should throw an error if user does not have UPDATE permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      await expect(controller.updateProject(data, user, projectID)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user._id)
      )
    })

    it('should throw an error if ProjectService.updateProject fails', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      projectService.updateProject = jest.fn().mockRejectedValue(new Error('Test Error'))
      await expect(controller.updateProject(data, user, projectID)).rejects.toThrow('Test Error')
    })

    it('should not throw an error when operation is successful', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      projectService.updateProject = jest.fn().mockResolvedValue({})
      await expect(controller.updateProject(data, user, projectID)).resolves.not.toThrow()
    })
  })
  describe('isProjectCachceValid', () => {
    it('should return false if "if-modified-since" header is missing', async () => {
      const result = await controller.isProjectCacheValid(projectID, undefined)
      expect(result).toBe(false)
    })

    it('should return false if project was updated after the "if-modified-since" header', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-02').getTime() / 1000,
      })
      const result = await controller.isProjectCacheValid(
        projectID,
        new Date('2023-01-01').toISOString()
      )
      expect(result).toBe(false)
    })

    it('should return true if project was not updated after the "if-modified-since" header', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-01').getTime() / 1000,
      })

      const result = await controller.isProjectCacheValid(
        projectID,
        new Date('2023-01-02').toISOString()
      )
      expect(result).toBe(true)
    })
  })
  describe('getProjectModels', () => {
    it('should throw error if user lacks READ permission', async () => {
      const types = ['type1', 'type2']

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      await expect(controller.getProjectModels(types, user, projectID)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user._id)
      )
    })

    it('should return all models if no types are specified', async () => {
      const mockModels = [{ objectType: 'type1' }, { objectType: 'type2' }, { objectType: 'type3' }]

      projectService.getProjectModels = jest.fn().mockResolvedValue(mockModels)
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      const result = await controller.getProjectModels({}, user, projectID)
      expect(result).toEqual(mockModels)
    })

    it('should return models of specified types', async () => {
      const mockModels = [{ objectType: 'type1' }, { objectType: 'type2' }, { objectType: 'type3' }]
      const types = ['type1', 'type3']

      projectService.getProjectModels = jest.fn().mockResolvedValue(mockModels)
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      const result = await controller.getProjectModels(types, user, projectID)
      expect(result).toEqual([{ objectType: 'type1' }, { objectType: 'type3' }])
    })
  })
  describe('updateUserRole', () => {
    it('should throw error if user lacks UPDATE_ROLES permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await expect(controller.updateUserRole(userID, role, user, projectID)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user._id)
      )
    })

    it('should call projectService.updateUserRole with correct params', async () => {
      projectService.updateUserRole = jest.fn().mockResolvedValue({})
      controller.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE_ROLES]))

      await controller.updateUserRole(userID, role, user, projectID)
      expect(projectService.updateUserRole).toHaveBeenCalledWith(projectID, userID, role)
    })
  })
  describe('createManuscript', () => {
    it('should throw error if user lacks CREATE_MANUSCRIPT permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await expect(
        controller.createManuscript(user, projectID, manuscriptID, templateID)
      ).rejects.toThrow(new RoleDoesNotPermitOperationError('Access denied', user._id))
    })

    it('should call projectService.createManuscript with correct params', async () => {
      projectService.createManuscript = jest.fn().mockResolvedValue({})
      controller.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.CREATE_MANUSCRIPT]))

      await controller.createManuscript(user, projectID, manuscriptID, templateID)
      expect(projectService.createManuscript).toHaveBeenCalledWith(
        projectID,
        manuscriptID,
        templateID
      )
    })
  })
  describe('getCollaborators', () => {
    it('should throw error if user lacks READ permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      await expect(controller.getCollaborators(user, projectID)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user._id)
      )
    })

    it('should call userService.getCollaborators with correct params', async () => {
      DIContainer.sharedContainer.userService.getCollaborators = jest.fn().mockResolvedValue([])
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await controller.getCollaborators(user, projectID)
      expect(DIContainer.sharedContainer.userService.getCollaborators).toHaveBeenCalledWith(
        projectID
      )
    })
  })
  describe('getArchive', () => {
    it('should throw error if user lacks READ permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      await expect(controller.getArchive(onlyIDs, accept, user, projectID)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user._id)
      )
    })

    it('should call projectService.makeArchive with correct params', async () => {
      projectService.makeArchive = jest.fn().mockResolvedValue([])
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await controller.getArchive(onlyIDs, accept, user, projectID)
      expect(projectService.makeArchive).toHaveBeenCalledWith(projectID, undefined, {
        getAttachments: false,
        onlyIDs: true,
        includeExt: true,
      })
    })
  })
  describe('generateAccessToken', () => {
    it('should throw error if user lacks READ permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      await expect(controller.generateAccessToken(scope, user, projectID)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user._id)
      )
    })

    it('should call projectService.generateAccessToken with correct params', async () => {
      projectService.generateAccessToken = jest.fn().mockResolvedValue('access_token')
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await controller.generateAccessToken(scope, user, projectID)
      expect(projectService.generateAccessToken).toHaveBeenCalledWith(projectID, userID, scope)
    })
  })
  describe('deleteProject', () => {
    it('should throw error if user lacks DELETE permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await expect(controller.deleteProject(projectID, user)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user._id)
      )
    })

    it('should call projectService.deleteProject with correct params', async () => {
      projectService.deleteProject = jest.fn().mockResolvedValue({})
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.DELETE]))

      await controller.deleteProject(projectID, user)
      expect(projectService.deleteProject).toHaveBeenCalledWith(projectID)
    })
  })
  describe('getPermissions', () => {
    it('should call projectService.getPermissions with correct params', async () => {
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set())

      await controller.getPermissions(projectID, userID)
      expect(projectService.getPermissions).toHaveBeenCalledWith(projectID, userID)
    })

    it('should return the permissions set received from projectService', async () => {
      const permissions = new Set([ProjectPermission.READ, ProjectPermission.UPDATE])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)

      const result = await controller.getPermissions(projectID, userID)
      expect(result).toEqual(permissions)
    })
  })
})
