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
import { ProjectPermission } from '../../../../../../src/DomainServices/ProjectService'
import { RoleDoesNotPermitOperationError } from '../../../../../../src/Errors'
import {
  createProjectReqWithoutProjectID,
  createProjectReqWithoutUser,
  validCreateProjectReq,
} from '../../../../../data/fixtures/requests'
beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})
const validMockProject = { _id: '123', title: 'Test Project', owners: ['user1'] }
describe('ProjectRoute', () => {
  let projectRoute: ProjectRoute

  let res: { status: jest.Mock<any, any>; send: jest.Mock<any, any> }
  beforeAll(() => {
    projectRoute = new ProjectRoute()
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }
  })
  describe('createProjectHandler', () => {
    it('should create a project and send the project object in the response', async () => {
      DIContainer.sharedContainer.projectService.createProject = jest
        .fn()
        .mockResolvedValue(validMockProject)

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
      DIContainer.sharedContainer.projectService.createProject = jest
        .fn()
        .mockResolvedValue(validMockProject)

      await expect(
        // @ts-ignore
        projectRoute.createProjectHandler(createProjectReqWithoutProjectID, res)
      ).resolves.not.toThrow()
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK)
    })
    it('should throw an error if ProjectService.createProject fails', async () => {
      DIContainer.sharedContainer.projectService.createProject = jest
        .fn()
        .mockRejectedValue(new Error('Test Error'))

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
      DIContainer.sharedContainer.projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.READ]))

      // @ts-ignore
      await expect(projectRoute.updateProjectHandler(validCreateProjectReq, res)).rejects.toThrow(
        RoleDoesNotPermitOperationError
      )
    })
    it('should throw an error if ProjectService.updateProject fails', async () => {
      DIContainer.sharedContainer.projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      DIContainer.sharedContainer.projectService.updateProject = jest
        .fn()
        .mockRejectedValue(new Error('Test Error'))

      // @ts-ignore
      await expect(projectRoute.updateProjectHandler(validCreateProjectReq, res)).rejects.toThrow(
        'Test Error'
      )
    })

    it('should not throw an error when operation is successful', async () => {
      DIContainer.sharedContainer.projectService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([ProjectPermission.UPDATE]))
      // @ts-ignore
      DIContainer.sharedContainer.projectService.updateProject = jest.fn().mockResolvedValue()
      await expect(
        // @ts-ignore
        projectRoute.updateProjectHandler(validCreateProjectReq, res)
      ).resolves.not.toThrow()
    })
  })
})
