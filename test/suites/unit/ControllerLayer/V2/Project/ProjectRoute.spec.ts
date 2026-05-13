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
import '../../../../../utilities/configMock'
import '../../../../../utilities/dbMock'

import { StatusCodes } from 'http-status-codes'

import { ProjectRoute } from '../../../../../../src/Controller/V2/Project/ProjectRoute'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ProjectService } from '../../../../../../src/DomainServices/ProjectService'
import { RoleDoesNotPermitOperationError, ValidationError } from '../../../../../../src/Errors'
import { ProjectPermission, ProjectUserRole } from '../../../../../../src/Models/ProjectModels'
import { DocumentClient } from '../../../../../../src/Models/RepositoryModels'
import { validManuscript } from '../../../../../data/fixtures/manuscripts'
import {
  createManuscriptRequest,
  createProjectRequest,
  deleteProjectRequest,
  exportJatsRequest,
  getArchiveRequest,
  getProjectModelsRequest,
  getUserProfilesRequest,
  removeUser,
  updateProjectRequest,
  updateUserRoleRequest,
} from '../../../../../data/fixtures/projectRouteRequests'
import { validProject } from '../../../../../data/fixtures/projects'
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
  let route: ProjectRoute

  const res: {
    status: jest.Mock
    set: jest.Mock
    send: jest.Mock
    end: jest.Mock
    type: jest.Mock
  } = {
    status: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
  }
  beforeEach(() => {
    route = new ProjectRoute()
  })
  describe('createProject', () => {
    it('should create a project and send the project object in the response', async () => {
      const project: { _id: string; title: string; owners: string[] } = {
        _id: '123',
        title: 'Test Project',
        owners: ['user1'],
      }

      projectService.createProject = jest.fn().mockResolvedValue(project)

      // @ts-ignore
      await route.createProject(createProjectRequest, res)

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
      expect(res.send).toHaveBeenCalledWith(project)
    })

    it('should throw an error if user is not found', async () => {
      await expect(
        // @ts-ignore
        route.createProject(removeUser(createProjectRequest), res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw an error if ProjectService.createProject fails', async () => {
      projectService.createProject = jest.fn().mockRejectedValue(new Error('Test Error'))

      await expect(
        // @ts-ignore
        route.createProject(createProjectRequest, res)
      ).rejects.toThrow('Test Error')
    })
  })
  describe('updateProject', () => {
    it('should throw an error if user is missing', async () => {
      await expect(
        // @ts-ignore
        route.updateProject(removeUser(updateProjectRequest), res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw an error if user does not have UPDATE permission', async () => {
      const permissions = new Set([ProjectPermission.READ])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)

      await expect(
        // @ts-ignore
        route.updateProject(updateProjectRequest, res)
      ).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', updateProjectRequest.user._id)
      )
    })
    it('should throw an error if ProjectService.updateProject fails', async () => {
      const permissions = new Set([ProjectPermission.UPDATE])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)

      projectService.updateProject = jest.fn().mockRejectedValue(new Error('Test Error'))

      await expect(
        // @ts-ignore
        route.updateProject(updateProjectRequest, res)
      ).rejects.toThrow('Test Error')
    })

    it('should return OK with invoked correctly', async () => {
      const permissions = new Set([ProjectPermission.UPDATE])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)

      projectService.updateProject = jest.fn().mockResolvedValue({})
      await expect(
        // @ts-ignore
        route.updateProject(updateProjectRequest, res)
      ).resolves.not.toThrow()
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('getProjectModels', () => {
    it('should throw an error if user is missing and cache is not valid', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-01').getTime() / 1000,
      })

      await expect(
        // @ts-ignore
        route.getProjectModels(removeUser(getProjectModelsRequest), res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw an error if user does not have READ permission and cache is not valid', async () => {
      const permissions = new Set([ProjectPermission.UPDATE])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-01').getTime() / 1000,
      })

      await expect(
        // @ts-ignore
        route.getProjectModels(getProjectModelsRequest, res)
      ).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', getProjectModelsRequest.user._id)
      )
    })

    it('should return NOT_MODIFIED status if project cache is valid', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2021-01-01').getTime() / 1000,
      })

      // @ts-ignore
      await route.getProjectModels(getProjectModelsRequest, res)

      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_MODIFIED)
      expect(res.end).toHaveBeenCalled()
    })

    it('should return NOT_MODIFIED status if project cache is valid even if user is missing', async () => {
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2021-01-01').getTime() / 1000,
      })

      // @ts-ignore
      await route.getProjectModels(removeUser(getProjectModelsRequest), res)

      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_MODIFIED)
      expect(res.end).toHaveBeenCalled()
    })

    it('should return OK if cache is not valid', async () => {
      const permissions = new Set([ProjectPermission.READ])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-01').getTime() / 1000,
      })
      projectService.getProjectModels = jest.fn().mockResolvedValue([])

      // @ts-ignore
      await route.getProjectModels(getProjectModelsRequest, res)

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })

    it('should return OK if header is missing', async () => {
      const permissions = new Set([ProjectPermission.READ])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-01').getTime() / 1000,
      })
      projectService.getProjectModels = jest.fn().mockResolvedValue([])

      const request = structuredClone(getProjectModelsRequest)
      request.headers['if-modified-since'] = ''

      // @ts-ignore
      await route.getProjectModels(request, res)

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('updateUserRole', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        route.updateUserRole(removeUser(updateUserRoleRequest), res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw an error if user does not have READ permission', async () => {
      const permissions = new Set([ProjectPermission.UPDATE])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)

      await expect(
        // @ts-ignore
        route.updateUserRole(updateUserRoleRequest, res)
      ).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', updateUserRoleRequest.user._id)
      )
    })

    it('should throw an error if role is invalid', async () => {
      const request = structuredClone(updateUserRoleRequest)
      request.body.role = 'invalid'

      await expect(
        // @ts-ignore
        route.updateUserRole(request, res)
      ).rejects.toThrow(new ValidationError('Invalid role', request.body.role))
    })

    it('should return NO_CONTENT if called correctly', async () => {
      const projectID = updateUserRoleRequest.params.projectID
      const userID = updateUserRoleRequest.body.userID
      const role = ProjectUserRole[updateUserRoleRequest.body.role as keyof typeof ProjectUserRole]
      const permissions = new Set([ProjectPermission.UPDATE_ROLES])
      projectService.updateUserRole = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)

      // @ts-ignore
      await route.updateUserRole(updateUserRoleRequest, res)

      expect(projectService.updateUserRole).toHaveBeenCalledWith(projectID, userID, role)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT)
    })
  })
  describe('createManuscript', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        route.createManuscript(removeUser(createManuscriptRequest), res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw error if user lacks CREATE_MANUSCRIPT permission', async () => {
      const permissions = new Set([ProjectPermission.READ])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      // @ts-ignore
      await expect(route.createManuscript(createManuscriptRequest)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', createManuscriptRequest.user._id)
      )
    })

    it('should return OK if called correctly', async () => {
      const projectID = createManuscriptRequest.params.projectID
      const templateID = createManuscriptRequest.body.templateID
      const permissions = new Set([ProjectPermission.CREATE_MANUSCRIPT])
      projectService.createManuscript = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      projectService.createManuscriptDoc = jest.fn()
      // @ts-ignore
      await route.createManuscript(createManuscriptRequest, res)

      expect(projectService.createManuscript).toHaveBeenCalledWith(projectID, templateID)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })

    it('should return OK if called correctly with a file', async () => {
      const docClient: DocumentClient = DIContainer.sharedContainer.documentClient
      const permissions = new Set([ProjectPermission.CREATE_MANUSCRIPT])
      docClient.createDocument = jest.fn().mockResolvedValue({})
      projectService.importJats = jest.fn().mockResolvedValue({})
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      projectService.getProjectModels = jest.fn().mockResolvedValue([validProject, validManuscript])

      const request = structuredClone(createManuscriptRequest)
      // @ts-ignore
      request.file = { path: '/tmp/test.zip' }

      // @ts-ignore
      await route.createManuscript(request, res)

      expect(projectService.importJats).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('getUserProfiles', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        route.getProjectUserProfiles(removeUser(getUserProfilesRequest), res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw error if user lacks READ permission', async () => {
      const permissions = new Set([ProjectPermission.UPDATE])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)

      // @ts-ignore
      await expect(route.getProjectUserProfiles(getUserProfilesRequest)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', getUserProfilesRequest.user._id)
      )
    })

    it('should call userService.getProjectUserProfiles with correct params', async () => {
      const projectID = getUserProfilesRequest.params.projectID
      const permissions = new Set([ProjectPermission.READ])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      DIContainer.sharedContainer.userService.getProjectUserProfiles = jest
        .fn()
        .mockResolvedValue([])

      // @ts-ignore
      await route.getProjectUserProfiles(getUserProfilesRequest, res)

      expect(DIContainer.sharedContainer.userService.getProjectUserProfiles).toHaveBeenCalledWith(
        projectID
      )
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('getArchive', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        route.getArchive(removeUser(getArchiveRequest), res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw error if user lacks READ permission', async () => {
      const permissions = new Set([ProjectPermission.UPDATE])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      // @ts-ignore
      await expect(route.getArchive(getArchiveRequest)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', getArchiveRequest.user._id)
      )
    })

    it('should return OK if called correctly', async () => {
      const permissions = new Set([ProjectPermission.READ])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      projectService.makeArchive = jest.fn().mockResolvedValue([])

      // @ts-ignore
      await route.getArchive(getArchiveRequest, res)

      expect(projectService.makeArchive).toHaveBeenCalledWith(getArchiveRequest.params.projectID, {
        getAttachments: true,
        onlyIDs: true,
        includeExt: true,
      })
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })

    it('should return OK if called correctly without manuscriptID', async () => {
      const permissions = new Set([ProjectPermission.READ])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      projectService.makeArchive = jest.fn().mockResolvedValue([])

      const request = structuredClone(getArchiveRequest)
      // @ts-ignore
      delete request.params.manuscriptID

      // @ts-ignore
      await route.getArchive(request, res)

      expect(projectService.makeArchive).toHaveBeenCalledWith(getArchiveRequest.params.projectID, {
        getAttachments: true,
        onlyIDs: true,
        includeExt: true,
      })
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
  })
  describe('deleteProject', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        route.deleteProject(removeUser(deleteProjectRequest), res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should throw error if user lacks DELETE permission', async () => {
      const permissions = new Set([ProjectPermission.READ])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)

      await expect(
        // @ts-ignore
        route.deleteProject(deleteProjectRequest, res)
      ).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', deleteProjectRequest.user._id)
      )
    })

    it('should return NO_CONTENT if called correctly', async () => {
      const projectID = deleteProjectRequest.params.projectID
      const permissions = new Set([ProjectPermission.DELETE])
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      projectService.deleteProject = jest.fn().mockResolvedValue({})

      // @ts-ignore
      await route.deleteProject(deleteProjectRequest, res)

      expect(projectService.deleteProject).toHaveBeenCalledWith(projectID)
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT)
    })
  })
  describe('exportJats', () => {
    it('should throw error if user is missing', async () => {
      await expect(
        // @ts-ignore
        route.exportJats(removeUser(exportJatsRequest), res)
      ).rejects.toThrow(new ValidationError('No user found', null))
    })

    it('should return ok if called correctly', async () => {
      const permissions = new Set([ProjectPermission.READ])
      projectService.exportJats = jest.fn().mockResolvedValue('')
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      projectService.getArticleModelMap = jest.fn().mockResolvedValue({ article: {}, modelMap: {} })

      // @ts-ignore
      await route.exportJats(exportJatsRequest, res)
      expect(projectService.exportJats).toHaveBeenCalled()
    })

    it('should fail if user lacks permissions', async () => {
      const permissions = new Set([])
      projectService.exportJats = jest.fn().mockResolvedValue('')
      projectService.getPermissions = jest.fn().mockResolvedValue(permissions)
      projectService.getArticleModelMap = jest.fn().mockResolvedValue({ article: {}, modelMap: {} })

      await expect(
        // @ts-ignore
        route.exportJats(exportJatsRequest, res)
      ).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', exportJatsRequest.user._id)
      )
    })
  })
})
