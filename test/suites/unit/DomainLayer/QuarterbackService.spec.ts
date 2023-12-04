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

import { DIContainer } from '../../../../src/DIContainer/DIContainer'
import { ContainerService } from '../../../../src/DomainServices/Container/ContainerService'
import { ProjectService } from '../../../../src/DomainServices/ProjectService'
import {
  QuarterbackPermission,
  QuarterbackService,
} from '../../../../src/DomainServices/Quarterback/QuarterbackService'
import { ContainerRole } from '../../../../src/Models/ContainerModels'

let quarterbackService: QuarterbackService
let containerService: ContainerService
let projectService: ProjectService
beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  quarterbackService = DIContainer.sharedContainer.quarterback
  containerService = DIContainer.sharedContainer.containerService
  projectService = DIContainer.sharedContainer.projectService
})
afterEach(() => {
  jest.clearAllMocks()
})

describe('QuarterbackService', () => {
  describe('validateUserAccess', () => {
    it('should not throw an error if user has access', async () => {
      const user = { _id: 'random_user_id' } as any
      quarterbackService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([QuarterbackPermission.READ, QuarterbackPermission.WRITE]))

      await expect(
        quarterbackService.validateUserAccess(user, 'random_project_id', QuarterbackPermission.READ)
      ).resolves.not.toThrow()

      await expect(
        quarterbackService.validateUserAccess(
          user,
          'random_project_id',
          QuarterbackPermission.WRITE
        )
      ).resolves.not.toThrow()
    })
    it('should throw an error if user does not have access', async () => {
      const user = { _id: 'random_user_id' } as any
      quarterbackService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([QuarterbackPermission.READ]))

      await expect(
        quarterbackService.validateUserAccess(
          user,
          'random_project_id',
          QuarterbackPermission.WRITE
        )
      ).rejects.toThrow()
    })
    it('should throw an error if user is not found', async () => {
      const user = undefined as any

      await expect(
        quarterbackService.validateUserAccess(
          user,
          'random_project_id',
          QuarterbackPermission.WRITE
        )
      ).rejects.toThrow()
    })
  })
  describe('getPermissions', () => {
    it('should return the correct permissions for a user', async () => {
      const projectID = 'random_project_id'
      const userID = 'random_user_id'
      const project = { _id: projectID } as any
      const role = ContainerRole.Owner
      containerService.getUserRole = jest.fn().mockReturnValue(role)
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const expectedPermissions = new Set([QuarterbackPermission.READ, QuarterbackPermission.WRITE])
      await expect(quarterbackService.getPermissions(projectID, userID)).resolves.toEqual(
        expectedPermissions
      )
      expect(containerService.getUserRole).toHaveBeenCalledWith(project, userID)
    })
    it('should return an empty set if the user has no permissions', async () => {
      const projectID = 'random_project_id'
      const userID = 'random_user_id'
      const project = { _id: projectID } as any
      const role = undefined
      containerService.getUserRole = jest.fn().mockReturnValue(role)
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const expectedPermissions = new Set([])
      await expect(quarterbackService.getPermissions(projectID, userID)).resolves.toEqual(
        expectedPermissions
      )
      expect(containerService.getUserRole).toHaveBeenCalledWith(project, userID)
    })
    it('should return an empty set if the user is not found', async () => {
      const projectID = 'random_project_id'
      const userID = 'random_user_id'
      const project = { _id: projectID } as any
      const role = null
      containerService.getUserRole = jest.fn().mockReturnValue(role)
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const expectedPermissions = new Set([])
      await expect(quarterbackService.getPermissions(projectID, userID)).resolves.toEqual(
        expectedPermissions
      )
      expect(containerService.getUserRole).toHaveBeenCalledWith(project, userID)
    })
  })
  describe('getManuscriptFromSnapshot', () => {
    it('should return the manuscript from the snapshot', async () => {
      const snapshot = { doc_id: 'random_manuscript_id' } as any
      const manuscript = { _id: snapshot.doc_id } as any
      DIContainer.sharedContainer.manuscriptRepository.getById = jest
        .fn()
        .mockResolvedValue(manuscript)
      await expect(quarterbackService.getManuscriptFromSnapshot(snapshot)).resolves.toStrictEqual(
        manuscript
      )
    })
    it('should throw an error if the manuscript is not found', async () => {
      const snapshot = { doc_id: 'random_manuscript_id' } as any
      DIContainer.sharedContainer.manuscriptRepository.getById = jest.fn().mockResolvedValue(null)
      await expect(quarterbackService.getManuscriptFromSnapshot(snapshot)).rejects.toThrow()
    })
  })
})
