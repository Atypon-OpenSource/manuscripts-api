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

import { StatusCodes } from 'http-status-codes'

import { ProjectRoute } from '../../../../../../src/Controller/V2/Project/ProjectRoute'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  ProjectPermission,
  ProjectService,
} from '../../../../../../src/DomainServices/ProjectService'
import { RoleDoesNotPermitOperationError, ValidationError } from '../../../../../../src/Errors'
import { ContainerRole } from '../../../../../../src/Models/ContainerModels'
import { templates } from '../../../../../data/dump/templates'
import { validManuscript } from '../../../../../data/fixtures/manuscripts'
import {
  projectRouteRequestWithInvalidRole,
  projectRouteRequestWithoutManuscriptID,
  projectRouteRequestWithoutProjectID,
  projectRouteRequestWithoutRole,
  projectRouteRequestWithoutScope,
  projectRouteRequestWithoutUser,
  projectRouteRequestWithoutUserID,
  validProjectRouteRequest,
} from '../../../../../data/fixtures/projectRouteRequests'
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

describe('ProjectRoute', () => {
  let projectRoute: ProjectRoute
  const validMockProject: { _id: string; title: string; owners: string[] } = {
    _id: '123',
    title: 'Test Project',
    owners: ['user1'],
  }
  const res: {
    status: jest.Mock
    set: jest.Mock
    send: jest.Mock
    end: jest.Mock
  } = {
    status: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  }
  beforeEach(() => {
    projectRoute = new ProjectRoute()
  })
  describe('createProjectHandler', () => {
    it('should create a project and send the project object in the response', async () => {
      projectService.createProject = jest.fn().mockResolvedValue(validMockProject)

      // @ts-ignore
      await projectRoute.createProjectHandler(validProjectRouteRequest, res)

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
      expect(res.send).toHaveBeenCalledWith(validMockProject)
    })
    it('should throw an error if user is not found', async () => {
      await expect(
        // @ts-ignore
        projectRoute.createProjectHandler(projectRouteRequestWithoutUser, res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })
    it('should not throw an error if projectID is missing', async () => {
      const projectService: any = DIContainer.sharedContainer.projectService

      projectService.createProject = jest.fn().mockResolvedValue(validMockProject)

      await expect(
        // @ts-ignore
        projectRoute.createProjectHandler(projectRouteRequestWithoutProjectID, res)
      ).resolves.not.toThrow()
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
    it('should throw an error if ProjectService.createProject fails', async () => {
      projectService.createProject = jest.fn().mockRejectedValue(new Error('Test Error'))

      await expect(
        // @ts-ignore
        projectRoute.createProjectHandler(validProjectRouteRequest, res)
      ).rejects.toThrow('Test Error')
    })
  })
  describe('updateProjectHandler', () => {
    it('should throw an error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateProjectHandler(projectRouteRequestWithoutUser, res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })
    it('should throw an error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateProjectHandler(projectRouteRequestWithoutProjectID, res)
      ).rejects.toThrow(new ValidationError('projectID parameter must be specified', null))
    })
    it('should throw an error if user does not have UPDATE permission', async () => {
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await expect(
        // @ts-ignore

        projectRoute.updateProjectHandler(validProjectRouteRequest, res)
      ).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', validProjectRouteRequest.user._id)
      )
    })
    it('should throw an error if ProjectService.updateProject fails', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      projectService.updateProject = jest.fn().mockRejectedValue(new Error('Test Error'))

      await expect(
        // @ts-ignore

        projectRoute.updateProjectHandler(validProjectRouteRequest, res)
      ).rejects.toThrow('Test Error')
    })

    it('should not throw an error when operation is successful', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      projectService.updateProject = jest.fn().mockResolvedValue({})
      await expect(
        // @ts-ignore
        projectRoute.updateProjectHandler(validProjectRouteRequest, res)
      ).resolves.not.toThrow()
    })
    it('should send correct status when operation is successful', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      projectService.updateProject = jest.fn().mockResolvedValue({})
      await expect(
        // @ts-ignore
        projectRoute.updateProjectHandler(validProjectRouteRequest, res)
      ).resolves.not.toThrow()
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('getProjectModelsHandler', () => {
    it('should throw an error if user is missing and cache is not valid', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-01').getTime() / 1000,
      })
      await expect(
        // @ts-ignore
        projectRoute.getProjectModelsHandler(projectRouteRequestWithoutUser, res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw an error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.getProjectModelsHandler(projectRouteRequestWithoutProjectID, res)
      ).rejects.toThrow(new ValidationError('projectID parameter must be specified', null))
    })
    it('should return NOT_MODIFIED status if project cache is valid', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2021-01-01').getTime() / 1000,
      })

      // @ts-ignore
      await projectRoute.getProjectModelsHandler(validProjectRouteRequest, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_MODIFIED)
      expect(res.end).toHaveBeenCalled()
    })
    it('should return project models if cache is not valid', async () => {
      const mockModels = [{ id: 'model1' }, { id: 'model2' }]

      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-01').getTime() / 1000,
      })
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      projectService.getProjectModels = jest.fn().mockResolvedValue(mockModels)
      // @ts-ignore
      await projectRoute.getProjectModelsHandler(validProjectRouteRequest, res)
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
    it('should throw an error if user does not have READ permission and cache is not valid', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-01').getTime() / 1000,
      })
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      await expect(
        // @ts-ignore
        projectRoute.getProjectModelsHandler(validProjectRouteRequest, res)
      ).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', validProjectRouteRequest.user._id)
      )
    })
  })
  describe('updateUserRoleHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(projectRouteRequestWithoutUser, res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })
    it('should throw an error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(projectRouteRequestWithoutProjectID, res)
      ).rejects.toThrow(new ValidationError('projectID parameter must be specified', null))
    })
    it('should throw an error if userID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(projectRouteRequestWithoutUserID, res)
      ).rejects.toThrow(new ValidationError('userID parameter must be specified', null))
    })
    it('should throw an error if user does not have READ permission', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-01').getTime() / 1000,
      })
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(validProjectRouteRequest, res)
      ).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', validProjectRouteRequest.user._id)
      )
    })
    it('should throw an error if role is invalid', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(projectRouteRequestWithInvalidRole, res)
      ).rejects.toThrow(
        new ValidationError('Invalid role', projectRouteRequestWithInvalidRole.body.role)
      )
    })
    it('should call projectService.updateUserRole with correct params', async () => {
      projectService.updateUserRole = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE_ROLES]))

      // @ts-ignore
      await projectRoute.updateUserRoleHandler(validProjectRouteRequest, res)

      expect(projectService.updateUserRole).toHaveBeenCalledWith(
        validProject._id,
        validUser._id,
        ContainerRole.Writer
      )
    })
    it('should send correct status when operation is successful', async () => {
      projectService.updateUserRole = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE_ROLES]))

      // @ts-ignore
      await projectRoute.updateUserRoleHandler(validProjectRouteRequest, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT)
    })
    it('should throw an error if Role is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(projectRouteRequestWithoutRole, res)
      ).rejects.toThrow(new ValidationError('Role must be string or null', null))
    })
  })
  describe('createManuscriptHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.createManuscriptHandler(projectRouteRequestWithoutUser, res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.createManuscriptHandler(projectRouteRequestWithoutProjectID)
      ).rejects.toThrow(new ValidationError('projectID parameter must be specified', null))
    })

    it('should throw error if user lacks CREATE_MANUSCRIPT permission', async () => {
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      // @ts-ignore
      await expect(projectRoute.createManuscriptHandler(validProjectRouteRequest)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', validProjectRouteRequest.user._id)
      )
    })

    it('should call projectService.createManuscript with correct params', async () => {
      projectService.createManuscript = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.CREATE_MANUSCRIPT]))
      // @ts-ignore
      await projectRoute.createManuscriptHandler(validProjectRouteRequest, res)
      expect(projectService.createManuscript).toHaveBeenCalledWith(
        validProject._id,
        validManuscript._id,
        templates[0]._id
      )
    })
    it('should send correct status when operation is successful', async () => {
      projectService.createManuscript = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.CREATE_MANUSCRIPT]))
      // @ts-ignore
      await projectRoute.createManuscriptHandler(validProjectRouteRequest, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('getCollaboratorsHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.getCollaboratorsHandler(projectRouteRequestWithoutUser, res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.getCollaboratorsHandler(projectRouteRequestWithoutProjectID)
      ).rejects.toThrow(new ValidationError('projectID parameter must be specified', null))
    })

    it('should throw error if user lacks READ permission', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      // @ts-ignore
      await expect(projectRoute.getCollaboratorsHandler(validProjectRouteRequest)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', validProjectRouteRequest.user._id)
      )
    })

    it('should call userService.getCollaborators with correct params', async () => {
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      DIContainer.sharedContainer.userService.getCollaborators = jest.fn().mockResolvedValue([])

      // @ts-ignore
      await projectRoute.getCollaboratorsHandler(validProjectRouteRequest, res)
      expect(DIContainer.sharedContainer.userService.getCollaborators).toHaveBeenCalledWith(
        validProject._id
      )
    })
    it('should send correct status when operation is successful', async () => {
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      DIContainer.sharedContainer.userService.getCollaborators = jest.fn().mockResolvedValue([])

      // @ts-ignore
      await projectRoute.getCollaboratorsHandler(validProjectRouteRequest, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('getArchiveHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.getArchiveHandler(projectRouteRequestWithoutUser, res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.getArchiveHandler(projectRouteRequestWithoutProjectID)
      ).rejects.toThrow(new ValidationError('projectID parameter must be specified', null))
    })
    it('should not throw error if manuscriptID is missing', async () => {
      projectService.makeArchive = jest.fn().mockResolvedValue([])
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      await expect(
        // @ts-ignore
        projectRoute.getArchiveHandler(projectRouteRequestWithoutManuscriptID, res)
      ).resolves.not.toThrow()
    })

    it('should throw error if user lacks READ permission', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      // @ts-ignore
      await expect(projectRoute.getArchiveHandler(validProjectRouteRequest)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', validProjectRouteRequest.user._id)
      )
    })

    it('should call projectService.makeArchive with correct params', async () => {
      projectService.makeArchive = jest.fn().mockResolvedValue([])
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      // @ts-ignore
      await projectRoute.getArchiveHandler(validProjectRouteRequest, res)

      expect(projectService.makeArchive).toHaveBeenCalledWith(
        validProject._id,
        validManuscript._id,
        {
          getAttachments: true,
          onlyIDs: true,
          includeExt: true,
        }
      )
    })
    it('should send correct status when operation is successful', async () => {
      projectService.makeArchive = jest.fn().mockResolvedValue([])
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      // @ts-ignore
      await projectRoute.getArchiveHandler(validProjectRouteRequest, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('generateAccessTokenHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.generateAccessTokenHandler(projectRouteRequestWithoutUser, res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.generateAccessTokenHandler(projectRouteRequestWithoutProjectID, res)
      ).rejects.toThrow(new ValidationError('projectID parameter must be specified', null))
    })

    it('should throw error if scope is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.generateAccessTokenHandler(projectRouteRequestWithoutScope, res)
      ).rejects.toThrow(new ValidationError('scope parameter must be specified', null))
    })

    it('should throw error if user lacks READ permission', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      await expect(
        // @ts-ignore
        projectRoute.generateAccessTokenHandler(validProjectRouteRequest, res)
      ).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', validProjectRouteRequest.user._id)
      )
    })

    it('should call projectService.generateAccessToken with correct params', async () => {
      projectService.generateAccessToken = jest.fn().mockResolvedValue('access_token')
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      // @ts-ignore
      await projectRoute.generateAccessTokenHandler(validProjectRouteRequest, res)
      expect(projectService.generateAccessToken).toHaveBeenCalledWith(
        validProject._id,
        validUser._id,
        validProjectRouteRequest.params.scope
      )
    })
    it('should send correct status when operation is successful', async () => {
      projectService.generateAccessToken = jest.fn().mockResolvedValue('123')
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      // @ts-ignore
      await projectRoute.generateAccessTokenHandler(validProjectRouteRequest, res)
      // @ts-ignore
      expect(res.send).toHaveBeenCalledWith('123')
    })
  })
  describe('deleteProjectHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.deleteProjectHandler(projectRouteRequestWithoutUser, res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.deleteProjectHandler(projectRouteRequestWithoutProjectID, res)
      ).rejects.toThrow(new ValidationError('projectID parameter must be specified', null))
    })

    it('should throw error if user lacks DELETE permission', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      await expect(
        // @ts-ignore
        projectRoute.deleteProjectHandler(validProjectRouteRequest, res)
      ).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', validProjectRouteRequest.user._id)
      )
    })

    it('should call projectService.deleteProject with correct params', async () => {
      projectService.deleteProject = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.DELETE]))
      // @ts-ignore
      await projectRoute.deleteProjectHandler(validProjectRouteRequest, res)
      expect(projectService.deleteProject).toHaveBeenCalledWith(validProject._id)
    })
    it('should send correct status when operation is successful', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.DELETE]))
      // @ts-ignore
      await projectRoute.deleteProjectHandler(validProjectRouteRequest, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
})
