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

import '../../../../utilities/configMock.ts'
import '../../../../utilities/dbMock.ts'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer.ts'
import {
  DocumentPermission,
  DocumentService,
} from '../../../../../src/DomainServices/DocumentService'
import { ProjectService } from '../../../../../src/DomainServices/ProjectService.ts'
import { ProjectUserRole } from '../../../../../src/Models/ProjectModels'

let documentService: DocumentService
let projectService: ProjectService
beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  documentService = DIContainer.sharedContainer.documentService
  projectService = DIContainer.sharedContainer.projectService
})
afterEach(() => {
  jest.clearAllMocks()
})

describe('DocumentService', () => {
  describe('validateUserAccess', () => {
    it('should not throw an error if user has access', async () => {
      const user = { id: 'random_user_id' } as any
      documentService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([DocumentPermission.READ, DocumentPermission.WRITE]))

      await expect(
        documentService.validateUserAccess(user.id, 'random_project_id', DocumentPermission.READ)
      ).resolves.not.toThrow()

      await expect(
        documentService.validateUserAccess(user.id, 'random_project_id', DocumentPermission.WRITE)
      ).resolves.not.toThrow()
    })
    it('should throw an error if user does not have access', async () => {
      const user = { id: 'random_user_id' } as any
      documentService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([DocumentPermission.READ]))

      await expect(
        documentService.validateUserAccess(user.id, 'random_project_id', DocumentPermission.WRITE)
      ).rejects.toThrow()
    })
    it('should throw an error if user is not found', async () => {
      const user = {
        id: undefined as any,
      }

      await expect(
        documentService.validateUserAccess(user.id, 'random_project_id', DocumentPermission.WRITE)
      ).rejects.toThrow()
    })
  })
  describe('getPermissions', () => {
    it('should return the correct permissions for a user', async () => {
      const projectID = 'random_project_id'
      const userID = 'random_user_id'
      const project = { _id: projectID } as any
      const role = ProjectUserRole.Owner
      projectService.getUserRole = jest.fn().mockReturnValue(role)
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const expectedPermissions = new Set([DocumentPermission.READ, DocumentPermission.WRITE])
      await expect(documentService.getPermissions(projectID, userID)).resolves.toEqual(
        expectedPermissions
      )
      expect(projectService.getUserRole).toHaveBeenCalledWith(project, userID)
    })
    it('should return an empty set if the user has no permissions', async () => {
      const projectID = 'random_project_id'
      const userID = 'random_user_id'
      const project = { _id: projectID } as any
      const role = undefined
      projectService.getUserRole = jest.fn().mockReturnValue(role)
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const expectedPermissions = new Set([])
      await expect(documentService.getPermissions(projectID, userID)).resolves.toEqual(
        expectedPermissions
      )
      expect(projectService.getUserRole).toHaveBeenCalledWith(project, userID)
    })
    it('should return an empty set if the user is not found', async () => {
      const projectID = 'random_project_id'
      const userID = 'random_user_id'
      const project = { _id: projectID } as any
      const role = null
      projectService.getUserRole = jest.fn().mockReturnValue(role)
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const expectedPermissions = new Set([])
      await expect(documentService.getPermissions(projectID, userID)).resolves.toEqual(
        expectedPermissions
      )
      expect(projectService.getUserRole).toHaveBeenCalledWith(project, userID)
    })
  })
  describe('getManuscriptFromSnapshot', () => {
    it('should return the manuscript from the snapshot', async () => {
      const snapshot = { doc_id: 'random_manuscript_id' } as any
      const manuscript = { _id: snapshot.doc_id } as any
      DIContainer.sharedContainer.projectClient.getProject = jest.fn().mockResolvedValue(manuscript)
      await expect(documentService.getManuscriptFromSnapshot(snapshot)).resolves.toStrictEqual(
        manuscript
      )
    })
    it('should throw an error if the manuscript is not found', async () => {
      const snapshot = { doc_id: 'random_manuscript_id' } as any
      DIContainer.sharedContainer.projectClient.getProject = jest.fn().mockResolvedValue(null)
      await expect(documentService.getManuscriptFromSnapshot(snapshot)).rejects.toThrow()
    })
  })
})
