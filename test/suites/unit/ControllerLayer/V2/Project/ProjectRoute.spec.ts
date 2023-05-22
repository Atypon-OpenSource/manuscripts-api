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
import { StatusCodes } from 'http-status-codes'

import { ProjectRoute } from '../../../../../../src/Controller/V2/Project/ProjectRoute'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  ProjectPermission,
  ProjectService,
} from '../../../../../../src/DomainServices/ProjectService'
import { RoleDoesNotPermitOperationError, ValidationError } from '../../../../../../src/Errors'
import {
  createProjectReqWithoutManuscriptID,
  createProjectReqWithoutProjectID,
  createProjectReqWithoutScope,
  createProjectReqWithoutUser,
  requestWithInvalidRole,
  requestWithoutRole,
  requestWithoutUserID,
  validCreateProjectReq,
} from '../../../../../data/fixtures/projectRouteRequests'
let projectService: ProjectService
beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
})
const validMockProject = { _id: '123', title: 'Test Project', owners: ['user1'] }
const projectRoute: ProjectRoute = new ProjectRoute()
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
describe('ProjectRoute', () => {
  describe('createProjectHandler', () => {
    it('should create a project and send the project object in the response', async () => {
      projectService.createProject = jest.fn().mockResolvedValue(validMockProject)

      // @ts-ignore
      await projectRoute.createProjectHandler(validCreateProjectReq, res)

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
      expect(res.send).toHaveBeenCalledWith(validMockProject)
    })
    it('should throw an error if user is not found', async () => {
      await expect(
        // @ts-ignore
        projectRoute.createProjectHandler(createProjectReqWithoutUser, res)
      ).rejects.toThrow('Validation error: No user found')
    })
    it('should not throw an error if projectID is missing', async () => {
      const projectService: any = DIContainer.sharedContainer.projectService

      projectService.createProject = jest.fn().mockResolvedValue(validMockProject)

      await expect(
        // @ts-ignore
        projectRoute.createProjectHandler(createProjectReqWithoutProjectID, res)
      ).resolves.not.toThrow()
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
    it('should throw an error if ProjectService.createProject fails', async () => {
      projectService.createProject = jest.fn().mockRejectedValue(new Error('Test Error'))

      // @ts-ignore
      await expect(projectRoute.createProjectHandler(validCreateProjectReq, res)).rejects.toThrow(
        'Test Error'
      )
    })
  })
  describe('updateProjectHandler', () => {
    it('should throw an error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateProjectHandler(createProjectReqWithoutUser, res)
      ).rejects.toThrow('Validation error: No user found')
    })
    it('should throw an error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateProjectHandler(createProjectReqWithoutProjectID, res)
      ).rejects.toThrow('Validation error: projectID parameter must be specified')
    })
    it('should throw an error if user does not have UPDATE permission', async () => {
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      await expect(projectRoute.updateProjectHandler(validCreateProjectReq, res)).rejects.toThrow(
        RoleDoesNotPermitOperationError
      )
    })
    it('should throw an error if ProjectService.updateProject fails', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      projectService.updateProject = jest.fn().mockRejectedValue(new Error('Test Error'))

      // @ts-ignore
      await expect(projectRoute.updateProjectHandler(validCreateProjectReq, res)).rejects.toThrow(
        'Test Error'
      )
    })

    it('should not throw an error when operation is successful', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      projectService.updateProject = jest.fn().mockResolvedValue({})
      await expect(
        // @ts-ignore
        projectRoute.updateProjectHandler(validCreateProjectReq, res)
      ).resolves.not.toThrow()
    })
    it('should send correct status when operation is successful', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      projectService.updateProject = jest.fn().mockResolvedValue({})
      await expect(
        // @ts-ignore
        projectRoute.updateProjectHandler(validCreateProjectReq, res)
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
        projectRoute.getProjectModelsHandler(createProjectReqWithoutUser, res)
      ).rejects.toThrow('Validation error: No user found')
    })

    it('should throw an error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.getProjectModelsHandler(createProjectReqWithoutProjectID, res)
      ).rejects.toThrow('Validation error: projectID parameter must be specified')
    })
    it('should return NOT_MODIFIED status if project cache is valid', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2021-01-01').getTime() / 1000,
      })

      // @ts-ignore
      await projectRoute.getProjectModelsHandler(validCreateProjectReq, res)
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
      await projectRoute.getProjectModelsHandler(validCreateProjectReq, res)
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
        projectRoute.getProjectModelsHandler(validCreateProjectReq, res)
      ).rejects.toThrow(RoleDoesNotPermitOperationError)
    })
  })
  describe('updateUserRoleHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(createProjectReqWithoutUser, res)
      ).rejects.toThrow(ValidationError)
    })
    it('should throw an error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(createProjectReqWithoutProjectID, res)
      ).rejects.toThrow('Validation error: projectID parameter must be specified')
    })
    it('should throw an error if userID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(requestWithoutUserID, res)
      ).rejects.toThrow('Validation error: userID parameter must be specified')
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
        projectRoute.updateUserRoleHandler(validCreateProjectReq, res)
      ).rejects.toThrow(RoleDoesNotPermitOperationError)
    })
    it('should throw an error if role is invalid', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(requestWithInvalidRole, res)
      ).rejects.toThrow('Validation error: Invalid role')
    })
    it('should call projectService.updateUserRole with correct params', async () => {
      projectService.updateUserRole = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE_ROLES]))

      // @ts-ignore
      await projectRoute.updateUserRoleHandler(validCreateProjectReq, res)

      expect(projectService.updateUserRole).toHaveBeenCalledWith('project_id', 'user_id', 'Writer')
    })
    it('should send correct status when operation is successful', async () => {
      projectService.updateUserRole = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE_ROLES]))

      // @ts-ignore
      await projectRoute.updateUserRoleHandler(validCreateProjectReq, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT)
    })
    it('should throw an error if Role is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.updateUserRoleHandler(requestWithoutRole, res)
      ).rejects.toThrow('Validation error: Role must be string or null')
    })
  })
  describe('createManuscriptHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.createManuscriptHandler(createProjectReqWithoutUser, res)
      ).rejects.toThrow('Validation error: No user found')
    })

    it('should throw error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.createManuscriptHandler(createProjectReqWithoutProjectID)
      ).rejects.toThrow('Validation error: projectID parameter must be specified')
    })

    it('should throw error if user lacks CREATE_MANUSCRIPT permission', async () => {
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      // @ts-ignore
      await expect(projectRoute.createManuscriptHandler(validCreateProjectReq)).rejects.toThrow(
        RoleDoesNotPermitOperationError
      )
    })

    it('should call projectService.createManuscript with correct params', async () => {
      projectService.createManuscript = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.CREATE_MANUSCRIPT]))
      // @ts-ignore
      await projectRoute.createManuscriptHandler(validCreateProjectReq, res)
      expect(projectService.createManuscript).toHaveBeenCalledWith(
        'project_id',
        'manuscript_id',
        'template_id'
      )
    })
    it('should send correct status when operation is successful', async () => {
      projectService.createManuscript = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.CREATE_MANUSCRIPT]))
      // @ts-ignore
      await projectRoute.createManuscriptHandler(validCreateProjectReq, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('getCollaboratorsHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.getCollaboratorsHandler(createProjectReqWithoutUser, res)
      ).rejects.toThrow('Validation error: No user found')
    })

    it('should throw error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.getCollaboratorsHandler(createProjectReqWithoutProjectID)
      ).rejects.toThrow('Validation error: projectID parameter must be specified')
    })

    it('should throw error if user lacks READ permission', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      // @ts-ignore
      await expect(projectRoute.getCollaboratorsHandler(validCreateProjectReq)).rejects.toThrow(
        RoleDoesNotPermitOperationError
      )
    })

    it('should call userService.getCollaborators with correct params', async () => {
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      DIContainer.sharedContainer.userService.getCollaborators = jest.fn().mockResolvedValue([])

      // @ts-ignore
      await projectRoute.getCollaboratorsHandler(validCreateProjectReq, res)
      expect(DIContainer.sharedContainer.userService.getCollaborators).toHaveBeenCalledWith(
        'project_id'
      )
    })
    it('should send correct status when operation is successful', async () => {
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      DIContainer.sharedContainer.userService.getCollaborators = jest.fn().mockResolvedValue([])

      // @ts-ignore
      await projectRoute.getCollaboratorsHandler(validCreateProjectReq, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('getArchiveHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.getArchiveHandler(createProjectReqWithoutUser, res)
      ).rejects.toThrow('Validation error: No user found')
    })

    it('should throw error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.getArchiveHandler(createProjectReqWithoutProjectID)
      ).rejects.toThrow('Validation error: projectID parameter must be specified')
    })
    it('should not throw error if manuscriptID is missing', async () => {
      projectService.makeArchive = jest.fn().mockResolvedValue([])
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      await expect(
        // @ts-ignore
        projectRoute.getArchiveHandler(createProjectReqWithoutManuscriptID, res)
      ).resolves.not.toThrow()
    })

    it('should throw error if user lacks READ permission', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      // @ts-ignore
      await expect(projectRoute.getArchiveHandler(validCreateProjectReq)).rejects.toThrow(
        RoleDoesNotPermitOperationError
      )
    })

    it('should call projectService.makeArchive with correct params', async () => {
      projectService.makeArchive = jest.fn().mockResolvedValue([])
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      // @ts-ignore
      await projectRoute.getArchiveHandler(validCreateProjectReq, res)

      expect(projectService.makeArchive).toHaveBeenCalledWith('project_id', 'manuscript_id', {
        getAttachments: true,
        onlyIDs: true,
        includeExt: true,
      })
    })
    it('should send correct status when operation is successful', async () => {
      projectService.makeArchive = jest.fn().mockResolvedValue([])
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      // @ts-ignore
      await projectRoute.getArchiveHandler(validCreateProjectReq, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('generateAccessTokenHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.generateAccessTokenHandler(createProjectReqWithoutUser, res)
      ).rejects.toThrow('Validation error: No user found')
    })

    it('should throw error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.generateAccessTokenHandler(createProjectReqWithoutProjectID, res)
      ).rejects.toThrow('Validation error: projectID parameter must be specified')
    })

    it('should throw error if scope is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.generateAccessTokenHandler(createProjectReqWithoutScope, res)
      ).rejects.toThrow('Validation error: scope parameter must be specified')
    })

    it('should throw error if user lacks READ permission', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      await expect(
        // @ts-ignore
        projectRoute.generateAccessTokenHandler(validCreateProjectReq, res)
      ).rejects.toThrow(RoleDoesNotPermitOperationError)
    })

    it('should call projectService.generateAccessToken with correct params', async () => {
      projectService.generateAccessToken = jest.fn().mockResolvedValue('access_token')
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      // @ts-ignore
      await projectRoute.generateAccessTokenHandler(validCreateProjectReq, res)
      expect(projectService.generateAccessToken).toHaveBeenCalledWith(
        'project_id',
        'User|9f338224-b0d5-45aa-b02c-21c7e0c3c07b',
        'random'
      )
    })
    it('should send correct status when operation is successful', async () => {
      projectService.generateAccessToken = jest.fn().mockResolvedValue('123')
      projectService.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      // @ts-ignore
      await projectRoute.generateAccessTokenHandler(validCreateProjectReq, res)
      // @ts-ignore
      expect(res.send).toHaveBeenCalledWith('123')
    })
  })
  describe('deleteProjectHandler', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.deleteProjectHandler(createProjectReqWithoutUser, res)
      ).rejects.toThrow('Validation error: No user found')
    })

    it('should throw error if projectID is missing', async () => {
      await expect(
        // @ts-ignore
        projectRoute.deleteProjectHandler(createProjectReqWithoutProjectID, res)
      ).rejects.toThrow('Validation error: projectID parameter must be specified')
    })

    it('should throw error if user lacks DELETE permission', async () => {
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      await expect(
        // @ts-ignore
        projectRoute.deleteProjectHandler(validCreateProjectReq, res)
      ).rejects.toThrow(RoleDoesNotPermitOperationError)
    })

    it('should call projectService.deleteProject with correct params', async () => {
      projectService.deleteProject = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.DELETE]))
      // @ts-ignore
      await projectRoute.deleteProjectHandler(validCreateProjectReq, res)
      expect(projectService.deleteProject).toHaveBeenCalledWith('project_id')
    })
    it('should send correct status when operation is successful', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.DELETE]))
      // @ts-ignore
      await projectRoute.deleteProjectHandler(validCreateProjectReq, res)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
})
