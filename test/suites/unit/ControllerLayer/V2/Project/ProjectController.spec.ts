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
import { ProjectController } from '../../../../../../src/Controller/V2/Project/ProjectController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ProjectPermission } from '../../../../../../src/DomainServices/ProjectService'
import { RoleDoesNotPermitOperationError, ValidationError } from '../../../../../../src/Errors'
beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

// @ts-ignore
const mockRequest = (body, params, user, headers, query?) => ({
  body,
  params,
  user,
  headers,
  query,
})

describe('ProjectController', () => {
  let controller: ProjectController

  beforeEach(() => {
    controller = new ProjectController()
  })
  describe('createProject', () => {
    it('should throw an error if user is not found', async () => {
      const req = mockRequest({ title: 'Test Project' }, { projectID: '123' }, null, {})
      // @ts-ignore
      await expect(controller.createProject(req)).rejects.toThrow('No user found')
    })
    it('should call projectService.createProject with correct parameters', async () => {
      const req = mockRequest({ title: 'Test Project' }, { projectID: '123' }, { _id: 'user1' }, {})
      const mockProject = { _id: '123', title: 'Test Project', owners: ['user1'] }

      DIContainer.sharedContainer.projectService.createProject = jest
        .fn()
        .mockResolvedValue(mockProject)

      // @ts-ignore
      const project = await controller.createProject(req)

      expect(DIContainer.sharedContainer.projectService.createProject).toHaveBeenCalledWith(
        'user1',
        '123',
        'Test Project'
      )
      expect(project).toEqual(mockProject)
    })
    it('should not throw an error if projectID is missing', async () => {
      const req = mockRequest({ title: 'Project Title' }, {}, { _id: 'some_user_id' }, {})

      // @ts-ignore
      await expect(controller.createProject(req)).resolves.not.toThrow()
    })
    it('should throw an error if ProjectService.createProject fails', async () => {
      const req = mockRequest(
        { title: 'Project Title' },
        { projectID: 'some_project_id' },
        { _id: 'some_user_id' },
        {}
      )

      DIContainer.sharedContainer.projectService.createProject = jest
        .fn()
        .mockRejectedValue(new Error('Test Error'))

      // @ts-ignore
      await expect(controller.createProject(req)).rejects.toThrow('Test Error')
    })
  })
  describe('updateProject', () => {
    it('should throw an error if user is missing', async () => {
      const req = mockRequest({ data: 'some_data' }, { projectID: 'some_project_id' }, {}, {})
      // @ts-ignore
      await expect(controller.updateProject(req)).rejects.toThrow('Access denied')
    })

    it('should throw an error if projectID is missing', async () => {
      const req = mockRequest({ data: 'some_data' }, {}, { _id: 'some_user_id' }, {})

      // @ts-ignore
      await expect(controller.updateProject(req)).rejects.toThrow(
        'Validation error: projectID parameter must be specified'
      )
    })

    it('should throw an error if user does not have UPDATE permission', async () => {
      const req = mockRequest(
        { data: 'some_data' },
        { projectID: 'some_project_id' },
        { _id: 'some_user_id' },
        {}
      )

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      await expect(controller.updateProject(req)).rejects.toThrow('Access denied')
    })

    it('should throw an error if ProjectService.updateProject fails', async () => {
      const req = mockRequest(
        { data: 'some_data' },
        { projectID: 'some_project_id' },
        { _id: 'some_user_id' },
        {}
      )

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      DIContainer.sharedContainer.projectService.updateProject = jest
        .fn()
        .mockRejectedValue(new Error('Test Error'))

      // @ts-ignore
      await expect(controller.updateProject(req)).rejects.toThrow('Test Error')
    })

    it('should not throw an error when operation is successful', async () => {
      const req = mockRequest(
        { data: 'some_data' },
        { projectID: 'some_project_id' },
        { _id: 'some_user_id' },
        {}
      )

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      // @ts-ignore
      DIContainer.sharedContainer.projectService.updateProject = jest.fn().mockResolvedValue()

      // @ts-ignore
      await expect(controller.updateProject(req)).resolves.not.toThrow()
    })
  })
  describe('isProjectCachceValid', () => {
    it('should return false if "if-modified-since" header is missing', async () => {
      const req = mockRequest({}, { projectID: 'some_project_id' }, {}, {})

      // @ts-ignore
      const result = await controller.isProjectCacheValid(req)
      expect(result).toBe(false)
    })

    it('should return false if project was updated after the "if-modified-since" header', async () => {
      const req = mockRequest(
        {},
        { projectID: 'some_project_id' },
        {},
        { 'if-modified-since': new Date('2023-01-01').toISOString() }
      )

      DIContainer.sharedContainer.projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-02').getTime() / 1000,
      })

      // @ts-ignore
      const result = await controller.isProjectCacheValid(req)
      expect(result).toBe(false)
    })

    it('should return true if project was not updated after the "if-modified-since" header', async () => {
      const req = mockRequest(
        {},
        { projectID: 'some_project_id' },
        {},
        { 'if-modified-since': new Date('2023-01-02').toISOString() }
      )

      DIContainer.sharedContainer.projectService.getProject = jest.fn().mockResolvedValue({
        updatedAt: new Date('2023-01-01').getTime() / 1000,
      })

      // @ts-ignore
      const result = await controller.isProjectCacheValid(req)
      expect(result).toBe(true)
    })
  })
  describe('getProjectModels', () => {
    it('should throw error if user is missing', async () => {
      const req = mockRequest(
        { types: ['type1', 'type2'] },
        { projectID: 'some_project_id' },
        null,
        {}
      )

      // @ts-ignore
      await expect(controller.getProjectModels(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if projectID is missing', async () => {
      const req = mockRequest({ types: ['type1', 'type2'] }, {}, { _id: 'some_user_id' }, {})

      // @ts-ignore
      await expect(controller.getProjectModels(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if user lacks READ permission', async () => {
      const req = mockRequest(
        { types: ['type1', 'type2'] },
        { projectID: 'some_project_id' },
        { _id: 'some_user_id' },
        {}
      )

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      // @ts-ignore
      await expect(controller.getProjectModels(req)).rejects.toThrow(
        RoleDoesNotPermitOperationError
      )
    })

    it('should return all models if no types are specified', async () => {
      const req = mockRequest({}, { projectID: 'some_project_id' }, { _id: 'some_user_id' }, {})

      const mockModels = [{ objectType: 'type1' }, { objectType: 'type2' }, { objectType: 'type3' }]

      DIContainer.sharedContainer.projectService.getProjectModels = jest
        .fn()
        .mockResolvedValue(mockModels)
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      const result = await controller.getProjectModels(req)
      expect(result).toEqual(mockModels)
    })

    it('should return models of specified types', async () => {
      const req = mockRequest(
        { types: ['type1', 'type3'] },
        { projectID: 'some_project_id' },
        { _id: 'some_user_id' },
        {}
      )

      const mockModels = [{ objectType: 'type1' }, { objectType: 'type2' }, { objectType: 'type3' }]

      DIContainer.sharedContainer.projectService.getProjectModels = jest
        .fn()
        .mockResolvedValue(mockModels)
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      const result = await controller.getProjectModels(req)
      expect(result).toEqual([{ objectType: 'type1' }, { objectType: 'type3' }])
    })
  })
  describe('updateUserRole', () => {
    it('should throw error if user is missing', async () => {
      const req = mockRequest(
        { userID: 'some_user_id', role: 'some_role' },
        { projectID: 'some_project_id' },
        null,
        {}
      )

      // @ts-ignore
      await expect(controller.updateUserRole(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if projectID is missing', async () => {
      const req = mockRequest({ role: 'some_role' }, {}, { _id: 'some_user_id' }, {})

      // @ts-ignore
      await expect(controller.updateUserRole(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if userID is missing', async () => {
      const req = mockRequest(
        { role: 'some_role' },
        { projectID: 'some_project_id' },
        { _id: 'some_user_id' },
        {}
      )

      // @ts-ignore
      await expect(controller.updateUserRole(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if role is missing', async () => {
      const req = mockRequest(
        { userID: 'some_user_id' },
        { projectID: 'some_project_id' },
        { _id: 'some_user_id' },
        {}
      )

      // @ts-ignore
      await expect(controller.updateUserRole(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if user lacks UPDATE_ROLES permission', async () => {
      const req = mockRequest(
        { userID: 'some_user_id', role: 'some_role' },
        { projectID: 'some_project_id' },
        { _id: 'some_user_id' },
        {}
      )

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      await expect(controller.updateUserRole(req)).rejects.toThrow(RoleDoesNotPermitOperationError)
    })

    it('should call projectService.updateUserRole with correct params', async () => {
      const req = mockRequest(
        { userID: 'some_user_id', role: 'some_role' },
        { projectID: 'some_project_id' },
        { _id: 'some_user_id' },
        {}
      )

      // @ts-ignore
      DIContainer.sharedContainer.projectService.updateUserRole = jest.fn().mockResolvedValue()
      controller.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE_ROLES]))

      // @ts-ignore
      await controller.updateUserRole(req)
      expect(DIContainer.sharedContainer.projectService.updateUserRole).toHaveBeenCalledWith(
        'some_project_id',
        'some_user_id',
        'some_role'
      )
    })
  })
  describe('createManuscript', () => {
    it('should throw error if user is missing', async () => {
      const req = mockRequest(
        { templateID: 'template_id' },
        { projectID: 'project_id', manuscriptID: 'manuscript_id' },
        null,
        {}
      )

      // @ts-ignore
      await expect(controller.createManuscript(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if projectID is missing', async () => {
      const req = mockRequest(
        { templateID: 'template_id' },
        { manuscriptID: 'manuscript_id' },
        { _id: 'some_user_id' },
        {}
      )

      // @ts-ignore
      await expect(controller.createManuscript(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if user lacks CREATE_MANUSCRIPT permission', async () => {
      const req = mockRequest(
        { templateID: 'template_id' },
        { projectID: 'project_id', manuscriptID: 'manuscript_id' },
        { _id: 'some_user_id' },
        {}
      )

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      await expect(controller.createManuscript(req)).rejects.toThrow(
        RoleDoesNotPermitOperationError
      )
    })

    it('should call projectService.createManuscript with correct params', async () => {
      const req = mockRequest(
        { templateID: 'template_id' },
        { projectID: 'project_id', manuscriptID: 'manuscript_id' },
        { _id: 'some_user_id' },
        {}
      )

      DIContainer.sharedContainer.projectService.createManuscript = jest.fn().mockResolvedValue({})
      controller.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.CREATE_MANUSCRIPT]))

      // @ts-ignore
      await controller.createManuscript(req)
      expect(DIContainer.sharedContainer.projectService.createManuscript).toHaveBeenCalledWith(
        'project_id',
        'manuscript_id',
        'template_id'
      )
    })
  })
  describe('getCollaborators', () => {
    it('should throw error if user is missing', async () => {
      const req = mockRequest({}, { projectID: 'project_id' }, null, {})

      // @ts-ignore
      await expect(controller.getCollaborators(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if projectID is missing', async () => {
      const req = mockRequest({}, {}, { _id: 'some_user_id' }, {})

      // @ts-ignore
      await expect(controller.getCollaborators(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if user lacks READ permission', async () => {
      const req = mockRequest({}, { projectID: 'project_id' }, { _id: 'some_user_id' }, {})

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      // @ts-ignore
      await expect(controller.getCollaborators(req)).rejects.toThrow(
        RoleDoesNotPermitOperationError
      )
    })

    it('should call userService.getCollaborators with correct params', async () => {
      const req = mockRequest({}, { projectID: 'project_id' }, { _id: 'some_user_id' }, {})

      DIContainer.sharedContainer.userService.getCollaborators = jest.fn().mockResolvedValue([])
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      await controller.getCollaborators(req)
      expect(DIContainer.sharedContainer.userService.getCollaborators).toHaveBeenCalledWith(
        'project_id'
      )
    })
  })
  describe('getArchive', () => {
    it('should throw error if user is missing', async () => {
      const req = mockRequest({}, { projectID: 'project_id' }, null, {}, {})

      // @ts-ignore
      await expect(controller.getArchive(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if projectID is missing', async () => {
      const req = mockRequest({}, {}, { _id: 'some_user_id' }, {}, {})

      // @ts-ignore
      await expect(controller.getArchive(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if user lacks READ permission', async () => {
      const req = mockRequest({}, { projectID: 'project_id' }, { _id: 'some_user_id' }, {}, {})

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      // @ts-ignore
      await expect(controller.getArchive(req)).rejects.toThrow(RoleDoesNotPermitOperationError)
    })

    it('should call projectService.makeArchive with correct params', async () => {
      const req = mockRequest(
        {},
        { projectID: 'project_id' },
        { _id: 'some_user_id' },
        { accept: 'application/json' },
        { onlyIDs: 'true' }
      )

      DIContainer.sharedContainer.projectService.makeArchive = jest.fn().mockResolvedValue([])
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      await controller.getArchive(req)
      expect(DIContainer.sharedContainer.projectService.makeArchive).toHaveBeenCalledWith(
        'project_id',
        undefined,
        {
          getAttachments: false,
          onlyIDs: true,
          includeExt: true,
        }
      )
    })
  })
  describe('generateAccessToken', () => {
    it('should throw error if user is missing', async () => {
      const req = mockRequest({}, { projectID: 'project_id', scope: 'scope' }, null, {})

      // @ts-ignore
      await expect(controller.generateAccessToken(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if projectID is missing', async () => {
      const req = mockRequest({}, { scope: 'scope' }, { _id: 'user_id' }, {})

      // @ts-ignore
      await expect(controller.generateAccessToken(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if scope is missing', async () => {
      const req = mockRequest({}, { projectID: 'project_id' }, { _id: 'user_id' }, {})

      // @ts-ignore
      await expect(controller.generateAccessToken(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if user lacks READ permission', async () => {
      const req = mockRequest(
        {},
        { projectID: 'project_id', scope: 'scope' },
        { _id: 'user_id' },
        {}
      )

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      // @ts-ignore
      await expect(controller.generateAccessToken(req)).rejects.toThrow(
        RoleDoesNotPermitOperationError
      )
    })

    it('should call projectService.generateAccessToken with correct params', async () => {
      const req = mockRequest(
        {},
        { projectID: 'project_id', scope: 'scope' },
        { _id: 'user_id' },
        {}
      )

      DIContainer.sharedContainer.projectService.generateAccessToken = jest
        .fn()
        .mockResolvedValue('access_token')
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      await controller.generateAccessToken(req)
      expect(DIContainer.sharedContainer.projectService.generateAccessToken).toHaveBeenCalledWith(
        'project_id',
        'user_id',
        'scope'
      )
    })
  })
  describe('deleteProject', () => {
    it('should throw error if user is missing', async () => {
      const req = mockRequest({}, { projectID: 'project_id' }, null, {})

      // @ts-ignore
      await expect(controller.deleteProject(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if projectID is missing', async () => {
      const req = mockRequest({}, {}, { _id: 'user_id' }, {})

      // @ts-ignore
      await expect(controller.deleteProject(req)).rejects.toThrow(ValidationError)
    })

    it('should throw error if user lacks DELETE permission', async () => {
      const req = mockRequest({}, { projectID: 'project_id' }, { _id: 'user_id' }, {})

      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      await expect(controller.deleteProject(req)).rejects.toThrow(RoleDoesNotPermitOperationError)
    })

    it('should call projectService.deleteProject with correct params', async () => {
      const req = mockRequest({}, { projectID: 'project_id' }, { _id: 'user_id' }, {})

      // @ts-ignore
      DIContainer.sharedContainer.projectService.deleteProject = jest.fn().mockResolvedValue()
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.DELETE]))

      // @ts-ignore
      await controller.deleteProject(req)
      expect(DIContainer.sharedContainer.projectService.deleteProject).toHaveBeenCalledWith(
        'project_id'
      )
    })
  })
  describe('getPermissions', () => {
    it('should call projectService.getPermissions with correct params', async () => {
      DIContainer.sharedContainer.projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set())

      await controller.getPermissions('project_id', 'user_id')
      expect(DIContainer.sharedContainer.projectService.getPermissions).toHaveBeenCalledWith(
        'project_id',
        'user_id'
      )
    })

    it('should return the permissions set received from projectService', async () => {
      const permissions = new Set([ProjectPermission.READ, ProjectPermission.UPDATE])
      DIContainer.sharedContainer.projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(permissions)

      const result = await controller.getPermissions('project_id', 'user_id')
      expect(result).toEqual(permissions)
    })
  })
})
