/*!
 * © 2020 Atypon Systems LLC
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

import '../../../../utilities/dbMock'

import jwt from 'jsonwebtoken'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { UserService } from '../../../../../src/DomainServices/UserService'
import { InvalidCredentialsError, RecordNotFoundError } from '../../../../../src/Errors'
import { ProjectClient, UserClient } from '../../../../../src/Models/RepositoryModels'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockReturnValue({ userID: 'User_1', deviceID: 'device123' }),
}))
beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('UserService', () => {
  let userService: UserService
  let userClient: UserClient
  let projectClient: ProjectClient

  beforeEach(() => {
    userClient = DIContainer.sharedContainer.userClient
    projectClient = DIContainer.sharedContainer.projectClient
    userService = DIContainer.sharedContainer.userService
  })

  describe('profile', () => {
    it('should return a user profile for a valid token', async () => {
      const mockUser = {
        id: 'User_1',
        email: 'test@example.com',
        family: 'Doe',
        given: 'John',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockToken = 'valid.token.value'

      userClient.findByID = jest.fn().mockResolvedValue(mockUser)

      const result = await userService.profile(mockToken)

      expect(jwt.decode).toHaveBeenCalledWith(mockToken)
      expect(userClient.findByID).toHaveBeenCalledWith('User_1')
      expect(result).toHaveProperty('email', 'test@example.com')
    })

    it('should throw InvalidCredentialsError for an invalid token payload', async () => {
      const mockToken = 'invalid.token.value'
      //@ts-ignore
      jwt.decode.mockReturnValue({ invalid: 'payload' })

      await expect(userService.profile(mockToken)).rejects.toThrow(InvalidCredentialsError)
    })
  })

  describe('getProjectUserProfiles', () => {
    it('should return user profiles for a valid project ID', async () => {
      const mockProjectID = ''
      const mockProject = {
        id: mockProjectID,
        owners: ['User_1'],
        writers: [],
        viewers: [],
      }
      const mockUser = {
        id: 'User_1',
        email: 'test@example.com',
        family: 'Doe',
        given: 'John',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      projectClient.getProject = jest.fn().mockResolvedValue(mockProject)
      userClient.findByID = jest.fn().mockResolvedValue(mockUser)
      const result = await userService.getProjectUserProfiles(mockProjectID)

      expect(projectClient.getProject).toHaveBeenCalled()
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('email', 'test@example.com')
    })

    it('should throw an error if the project does not exist', async () => {
      const mockProjectID = 'Non_Existing_Project'
      projectClient.getProject = jest.fn().mockResolvedValue(null)
      await expect(userService.getProjectUserProfiles(mockProjectID)).rejects.toThrow(
        new RecordNotFoundError(mockProjectID)
      )
    })
  })

  describe('getUserProjects', () => {
    it('should return projects for a valid user ID', async () => {
      const mockUserID = 'User_1'
      const mockProjects = [
        { id: 'Project_1', name: 'Project One', createdAt: new Date(), updatedAt: new Date() },
        { id: 'Project_2', name: 'Project Two', createdAt: new Date(), updatedAt: new Date() },
      ]
      projectClient.userProjects = jest.fn().mockResolvedValue(mockProjects)

      const result = await userService.getUserProjects(mockUserID)

      expect(projectClient.userProjects).toHaveBeenCalledWith(mockUserID)
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('name', 'Project One')
      expect(result[1]).toHaveProperty('name', 'Project Two')
    })

    it('should handle no projects found for a user ID', async () => {
      const mockUserID = 'User_2'
      projectClient.userProjects = jest.fn().mockResolvedValue([])

      const result = await userService.getUserProjects(mockUserID)

      expect(projectClient.userProjects).toHaveBeenCalledWith(mockUserID)
      expect(result).toEqual([])
    })
  })
})
