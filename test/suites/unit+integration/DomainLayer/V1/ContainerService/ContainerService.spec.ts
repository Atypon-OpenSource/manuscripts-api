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

import '../../../../../utilities/dbMock'

import { ContainerService } from '../../../../../../src/DomainServices/Container/ContainerService'
import { ContainerRole, ContainerType } from '../../../../../../src/Models/ContainerModels'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { InvalidCredentialsError, RecordNotFoundError, ValidationError } from '../../../../../../src/Errors'
import { validProject } from '../../../../../data/fixtures/projects'
import { log } from '../../../../../../src/Utilities/Logger'

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('ContainerService - compareRoles', () => {
  test('Should return 0 if the roles are equal', () => {
    expect(
      ContainerService.compareRoles(ContainerRole.Viewer, ContainerRole.Viewer)
    ).toBe(0)
  })

  test('Should return 1 if the first role is better', () => {
    expect(
      ContainerService.compareRoles(ContainerRole.Owner, ContainerRole.Viewer)
    ).toBe(1)
  })

  test('Should return -1 if the first role is worse', () => {
    expect(
      ContainerService.compareRoles(ContainerRole.Writer, ContainerRole.Owner)
    ).toBe(-1)
  })
})

describe('ContainerService - getProjectUserRole', () => {
  test('Should return writer if the user is writer', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService[ContainerType.project].getUserRole({
        _id: 'MPProject:project-id',
        owners: [],
        viewers: [],
        writers: ['User_validId']
      } as any,
        'User_validId'
      )
    ).toBe(ContainerRole.Writer)
  })

  test('Should return viewer if the user is viewer', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService[ContainerType.project].getUserRole({
        _id: 'MPProject:project-id',
        owners: [],
        viewers: ['User_validId'],
        writers: []
      } as any,
        'User_validId'
      )
    ).toBe(ContainerRole.Viewer)
  })

  test('Should return owner if the user is owner', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService[ContainerType.project].getUserRole({
        _id: 'MPProject:project-id',
        owners: ['User_validId'],
        viewers: [],
        writers: []
      } as any,
        'User_validId'
      )
    ).toBe(ContainerRole.Owner)
  })

  test('Should return owner if the user is owner', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService[ContainerType.project].getUserRole({
        _id: 'MPProject:project-id',
        owners: ['User_validId'],
        viewers: [],
        writers: [],
        annotators: ['User_validId2']
      } as any,
        'User_validId2'
      )
    ).toBe(ContainerRole.Annotator)
  })

  test('Should return owner if the user is owner', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService[ContainerType.project].getUserRole({
        _id: 'MPProject:project-id',
        owners: ['User_validId'],
        viewers: [],
        writers: [],
        editors: ['User_validId2']
      } as any,
        'User_validId2'
      )
    ).toBe(ContainerRole.Editor)
  })
  test('Should return true if user is a contributor|owner', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getContainer = jest.fn().mockImplementationOnce(() => {
      return {
        _id: 'MPProject:project-id',
        owners: ['User_validId'],
        viewers: [],
        writers: []
      }
    })
    let result = await containerService.checkUserContainerAccess('User_validId', 'MPProject:project-id')
    expect(result).toBeTruthy()
  })

  test('Should return true if user is a owner or writer', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getContainer = jest.fn().mockImplementationOnce(() => {
      return {
        _id: 'MPProject:project-id',
        owners: ['User_validId'],
        viewers: [],
        writers: []
      }
    })
    let result = await containerService.checkIfOwnerOrWriter('User_validId', 'MPProject:project-id')
    expect(result).toBeTruthy()
  })

  test('Should return true if user can create manuscript note', async () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]
    containerService.getContainer = jest.fn().mockImplementation(() => {
      return {
        _id: 'MPProject:project-id',
        owners: ['User_validId'],
        viewers: [],
        writers: [],
        editors: ['User_validId-2'],
        annotators: ['User_validId-3']
      }
    })
    let result = await containerService.checkIfUserCanCreateNote('User_validId-2', 'MPProject:project-id')
    expect(result).toBeTruthy()

    result = await containerService.checkIfUserCanCreateNote('User_validId-3', 'MPProject:project-id')
    expect(result).toBeTruthy()
  })

  test('Should return null if the user not in the project', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService[ContainerType.project].getUserRole({
        _id: 'MPProject:project-id',
        owners: [],
        viewers: [],
        writers: []
      } as any,
        'User_validId'
      )
    ).toBeNull()
  })
})

describe('ProjectService - isOwner/isWriter/isViewer/isEditor/isViewer', () => {
  test('should throw if project is null in isOwner', () => {
    expect(() =>
      ContainerService.isOwner(null as any, 'userId')
    ).toThrowError(RecordNotFoundError)
  })

  test('should throw if project is null in isWriter', () => {
    expect(() =>
      ContainerService.isWriter(null as any, 'userId')
    ).toThrowError(RecordNotFoundError)
  })

  test('should throw if project is null in isViewer', () => {
    expect(() =>
      ContainerService.isViewer(null as any, 'userId')
    ).toThrowError(RecordNotFoundError)
  })

  test('should throw if project is null in isEditor', () => {
    expect(() =>
      ContainerService.isEditor(null as any, 'userId')
    ).toThrowError(RecordNotFoundError)
  })

  test('should throw if project is null in isAnnotator', () => {
    expect(() =>
     ContainerService.isAnnotator(null as any, 'userId')
    ).toThrowError(RecordNotFoundError)
  })
})

describe('ContainerService - isPublic', () => {
  test('Should return true if the project is public', () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]

    expect(
      containerService.isPublic({
        _id: 'MPProject:project-id',
        objectType: 'MPProject',
        owners: [],
        viewers: ['*'],
        writers: ['User_validId']
      }as any)
    ).toBeTruthy()
  })

  test('Should return false if the project is not public', () => {
    const containerService = DIContainer.sharedContainer.containerService[ContainerType.project]

    expect(
      containerService.isPublic({
        _id: 'MPProject:project-id',
        objectType: 'MPProject',
        owners: [],
        viewers: ['User_otherValidId'],
        writers: ['User_validId']
      }as any)
    ).toBeFalsy()
  })
})

describe('ContainerService - getProject', () => {
  test('Should fail if token is not provided', async () => {
    const userService = DIContainer.sharedContainer.userService
    const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]
    userService.authenticateUser = jest.fn()
    await expect(containerService.getProject('userId', 'containerId', 'manuscriptId', null)).rejects.toThrow(InvalidCredentialsError)
  })

  test('should fail if user don\'t have access to project', async () => {
    const userService = DIContainer.sharedContainer.userService
    const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]
    userService.authenticateUser = jest.fn()
    containerService.checkUserContainerAccess = jest.fn(() => { return false })
    await expect(containerService.getProject('userId', 'containerId', 'manuscriptId', 'token')).rejects.toThrow(ValidationError)
  })

  test('Should fail if no project resources found', async () => {
    const userService = DIContainer.sharedContainer.userService
    const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]
    const projectRepository = DIContainer.sharedContainer.projectRepository
    userService.authenticateUser = jest.fn()
    projectRepository.getContainerResources = jest.fn()
    containerService.checkUserContainerAccess = jest.fn(() => { return true })
    await expect(containerService.getProject('userId', 'containerId', 'manuscriptId', 'token')).rejects.toThrow(Error)
  })

  test('Should return true if the project is public', async () => {
    const userService = DIContainer.sharedContainer.userService
    const containerService: any = DIContainer.sharedContainer.containerService[ContainerType.project]
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    userService.authenticateUser = jest.fn()
    projectRepository.getContainerResources = jest.fn(() => [ validProject ])
    containerService.checkUserContainerAccess = jest.fn(() => { return true })
    const result = await containerService.getProject('userId', 'containerId', 'manuscriptId', 'token')
    log.debug(JSON.stringify(result))
    expect(result).toBeTruthy()
  })
})
