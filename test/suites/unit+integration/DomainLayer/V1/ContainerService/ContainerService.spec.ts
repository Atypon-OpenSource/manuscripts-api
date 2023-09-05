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

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ContainerService } from '../../../../../../src/DomainServices/Container/ContainerService'
import { ContainerRole, ContainerType } from '../../../../../../src/Models/ContainerModels'

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('ContainerService - compareRoles', () => {
  test('Should return 0 if the roles are equal', () => {
    expect(ContainerService.compareRoles(ContainerRole.Viewer, ContainerRole.Viewer)).toBe(0)
  })

  test('Should return 1 if the first role is better', () => {
    expect(ContainerService.compareRoles(ContainerRole.Owner, ContainerRole.Viewer)).toBe(1)
  })

  test('Should return -1 if the first role is worse', () => {
    expect(ContainerService.compareRoles(ContainerRole.Writer, ContainerRole.Owner)).toBe(-1)
  })
})

describe('ContainerService - getProjectUserRole', () => {
  test('Should return writer if the user is writer', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService.getUserRole(
        {
          _id: 'MPProject:project-id',
          owners: [],
          viewers: [],
          writers: ['User_validId'],
        } as any,
        'User_validId'
      )
    ).toBe(ContainerRole.Writer)
  })

  test('Should return viewer if the user is viewer', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService.getUserRole(
        {
          _id: 'MPProject:project-id',
          owners: [],
          viewers: ['User_validId'],
          writers: [],
        } as any,
        'User_validId'
      )
    ).toBe(ContainerRole.Viewer)
  })

  test('Should return owner if the user is owner', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService.getUserRole(
        {
          _id: 'MPProject:project-id',
          owners: ['User_validId'],
          viewers: [],
          writers: [],
        } as any,
        'User_validId'
      )
    ).toBe(ContainerRole.Owner)
  })

  test('user should be annotator', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService.getUserRole(
        {
          _id: 'MPProject:project-id',
          owners: ['User_validId'],
          viewers: [],
          writers: [],
          annotators: ['User_validId2'],
        } as any,
        'User_validId2'
      )
    ).toBe(ContainerRole.Annotator)
  })

  test('user should be editor', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService.getUserRole(
        {
          _id: 'MPProject:project-id',
          owners: ['User_validId'],
          viewers: [],
          writers: [],
          editors: ['User_validId2'],
        } as any,
        'User_validId2'
      )
    ).toBe(ContainerRole.Editor)
  })
  test('Should return true if user is a contributor|owner', async () => {
    const containerService = DIContainer.sharedContainer.containerService
    containerService.getContainer = jest.fn().mockImplementationOnce(() => {
      return {
        _id: 'MPProject:project-id',
        owners: ['User_validId'],
        viewers: [],
        writers: [],
      }
    })
    const result = await containerService.checkUserContainerAccess(
      'User_validId',
      'MPProject:project-id'
    )
    expect(result).toBeTruthy()
  })

  test('Should return true if user is a owner or writer', async () => {
    const containerService = DIContainer.sharedContainer.containerService
    containerService.getContainer = jest.fn().mockImplementationOnce(() => {
      return {
        _id: 'MPProject:project-id',
        owners: ['User_validId'],
        viewers: [],
        writers: [],
      }
    })
    const result = await containerService.checkIfOwnerOrWriter(
      'User_validId',
      'MPProject:project-id'
    )
    expect(result).toBeTruthy()
  })

  test('Should return true if user can create manuscript note', async () => {
    const containerService = DIContainer.sharedContainer.containerService
    containerService.getContainer = jest.fn().mockImplementation(() => {
      return {
        _id: 'MPProject:project-id',
        owners: ['User_validId'],
        viewers: [],
        writers: [],
        editors: ['User_validId-2'],
        annotators: ['User_validId-3'],
      }
    })
    let result = await containerService.checkIfUserCanCreateNote(
      'User_validId-2',
      'MPProject:project-id'
    )
    expect(result).toBeTruthy()

    result = await containerService.checkIfUserCanCreateNote(
      'User_validId-3',
      'MPProject:project-id'
    )
    expect(result).toBeTruthy()
  })

  test('Should return null if the user not in the project', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService.getUserRole(
        {
          _id: 'MPProject:project-id',
          owners: [],
          viewers: [],
          writers: [],
        } as any,
        'User_validId'
      )
    ).toBeNull()
  })
})

describe('ContainerService - isPublic', () => {
  test('Should return true if the project is public', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService.isPublic({
        _id: 'MPProject:project-id',
        objectType: 'MPProject',
        owners: [],
        viewers: ['*'],
        writers: ['User_validId'],
      } as any)
    ).toBeTruthy()
  })

  test('Should return false if the project is not public', () => {
    const containerService = DIContainer.sharedContainer.containerService

    expect(
      containerService.isPublic({
        _id: 'MPProject:project-id',
        objectType: 'MPProject',
        owners: [],
        viewers: ['User_otherValidId'],
        writers: ['User_validId'],
      } as any)
    ).toBeFalsy()
  })
})
