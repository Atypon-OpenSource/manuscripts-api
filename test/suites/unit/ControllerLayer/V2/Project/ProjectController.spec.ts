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


import { Model } from '../../../../../../src/Models/BaseModels'
import { ProjectController } from '../../../../../../src/Controller/V2/Project/ProjectController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ProjectService } from '../../../../../../src/DomainServices/ProjectService'
import { RecordNotFoundError, RoleDoesNotPermitOperationError } from '../../../../../../src/Errors'
import { ProjectPermission, ProjectUserRole } from '../../../../../../src/Models/ProjectModels'
import { DocumentClient, SnapshotClient } from '../../../../../../src/Models/RepositoryModels'
import { templates } from '../../../../../data/dump/templates'
import { ValidHeaderWithApplicationKey } from '../../../../../data/fixtures/headers'
import { validManuscript } from '../../../../../data/fixtures/manuscripts'
import { validProject } from '../../../../../data/fixtures/projects'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let projectService: ProjectService
let documentClient: DocumentClient
let snapshotClient: SnapshotClient
beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  projectService = DIContainer.sharedContainer.projectService
  documentClient = DIContainer.sharedContainer.documentClient
  snapshotClient = DIContainer.sharedContainer.snapshotClient
})
afterEach(() => {
  jest.clearAllMocks()
})

describe('ProjectController', () => {
  let controller: ProjectController
  const projectTitle = 'random_project_title'
  const projectID = validProject._id
  const manuscriptID = validManuscript._id
  const doi = '10.5555/test-doi'
  const user = validUser as Express.User
  const userID = user.id
  const role = ProjectUserRole.Owner
  const templateID = templates[0]._id
  const onlyIDs = 'true'
  const accept = ValidHeaderWithApplicationKey['Accept']
  const data: Model[] = [
    {
      _id: validProject._id,
        objectType: 'MPProject',
      createdAt: 20 / 12 / 2020,
      updatedAt: 21 / 12 / 2020,
    },
  ]
  const manuscriptDoc = {
    doc: {
      attrs: {
        doi: '',
      },
    },
  }
  beforeEach(() => {
    controller = new ProjectController()
  })
  describe('createProject', () => {
    it('should call projectService.createProject with correct parameters', async () => {
      const mockProject = { _id: '123', projectTitle: 'Test Project', owners: ['user1'] }

      projectService.createProject = jest.fn().mockResolvedValue(mockProject)

      const project = await controller.createProject(projectTitle, user)

      expect(projectService.createProject).toHaveBeenCalledWith(userID, projectTitle)
      expect(project).toEqual(mockProject)
    })
    it('should throw an error if ProjectService.createProject fails', async () => {
      projectService.createProject = jest.fn().mockRejectedValue(new Error('Test Error'))

      await expect(controller.createProject(projectTitle, user)).rejects.toThrow('Test Error')
    })
  })
  describe('updateProject', () => {
    it('should throw an error if user does not have UPDATE permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      await expect(controller.updateProject(data, user, projectID)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user.id)
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
  describe('updateManuscriptDoi', () => {
    it('should throw an error if user does not have UPDATE permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))
      await expect(controller.updateManuscript(user, projectID, manuscriptID, doi)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user.id)
      )
    })

    it('should throw an error if manuscript not found fails', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      controller.getProjectModels = jest.fn().mockResolvedValue([])
      await expect(controller.updateManuscript(user, projectID, manuscriptID, doi)).rejects.toThrow(
        RecordNotFoundError
      )
    })

    it('should not throw an error when operation is successful', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      controller.getProjectModels = jest.fn().mockResolvedValue([validManuscript])
      projectService.updateManuscript = jest.fn().mockResolvedValue({})
      documentClient.findDocument = jest.fn().mockResolvedValue(manuscriptDoc)
      documentClient.updateDocument = jest.fn().mockResolvedValue({})
      snapshotClient.saveSnapshot = jest.fn().mockResolvedValue({})
      await expect(
        controller.updateManuscript(user, projectID, manuscriptID, doi)
      ).resolves.not.toThrow()
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
        new RoleDoesNotPermitOperationError('Access denied', user.id)
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

      await expect(controller.updateUserRole(userID, user, projectID, role)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user.id)
      )
    })

    it('should call projectService.updateUserRole with correct params', async () => {
      projectService.updateUserRole = jest.fn().mockResolvedValue({})
      controller.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE_ROLES]))

      await controller.updateUserRole(userID, user, projectID, role)
      expect(projectService.updateUserRole).toHaveBeenCalledWith(projectID, userID, role)
    })
  })
  describe('createManuscript', () => {
    it('should throw error if user lacks CREATE_MANUSCRIPT permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await expect(controller.createArticleNode(user, projectID, templateID)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user.id)
      )
    })

    it('should call projectService.createManuscript with correct params', async () => {
      projectService.createManuscript = jest.fn().mockResolvedValue({ _id: 'manuscript-123' })
      controller.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.CREATE_MANUSCRIPT]))
      DIContainer.sharedContainer.documentClient.createDocument = jest.fn()
      await controller.createArticleNode(user, projectID, templateID)
      expect(projectService.createManuscript).toHaveBeenCalledWith(projectID, templateID)
    })
  })
  describe('getUserProfiles', () => {
    it('should throw error if user lacks READ permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      await expect(controller.getUserProfiles(user, projectID)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user.id)
      )
    })

    it('should call userService.getUserProfiles with correct params', async () => {
      DIContainer.sharedContainer.userService.getProjectUserProfiles = jest
        .fn()
        .mockResolvedValue([])
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await controller.getUserProfiles(user, projectID)
      expect(DIContainer.sharedContainer.userService.getProjectUserProfiles).toHaveBeenCalledWith(
        projectID
      )
    })
  })
  describe('getArchive', () => {
    it('should throw error if user lacks READ permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.UPDATE]))

      await expect(controller.getArchive(onlyIDs, accept, user, projectID)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user.id)
      )
    })

    it('should call projectService.makeArchive with correct params', async () => {
      projectService.makeArchive = jest.fn().mockResolvedValue([])
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await controller.getArchive(onlyIDs, accept, user, projectID)
      expect(projectService.makeArchive).toHaveBeenCalledWith(projectID, {
        getAttachments: false,
        onlyIDs: true,
        includeExt: true,
      })
    })
  })
  describe('deleteProject', () => {
    it('should throw error if user lacks DELETE permission', async () => {
      controller.getPermissions = jest.fn().mockResolvedValue(new Set([ProjectPermission.READ]))

      await expect(controller.deleteProject(projectID, user)).rejects.toThrow(
        new RoleDoesNotPermitOperationError('Access denied', user.id)
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
