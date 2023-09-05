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

import { Chance } from 'chance'

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  RoleDoesNotPermitOperationError,
  UserRoleError,
  ValidationError,
} from '../../../../../../src/Errors'
import { ContainerRole } from '../../../../../../src/Models/ContainerModels'
import { validProject } from '../../../../../data/fixtures/projects'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

const chance = new Chance()

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('ContainerRequestService - create', () => {
  test('should fail if users current role is less limiting than requested', () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      ensureValidRole: () => {},
      getUserRole: () => ContainerRole.Owner,
    }

    containerRequestService.userProfileRepository = {
      getById: async () => Promise.resolve({}),
    }

    return expect(
      containerRequestService.create(
        { _id: `User_${chance.guid()}` },
        validProject._id,
        ContainerRole.Viewer
      )
    ).rejects.toThrow(UserRoleError)
  })

  test('should fail if users current role is the same as the reuquested', () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      ensureValidRole: () => {},
      getUserRole: () => ContainerRole.Viewer,
    }

    containerRequestService.userProfileRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(
      containerRequestService.create(
        { _id: `User_${chance.guid()}` },
        validProject._id,
        ContainerRole.Viewer
      )
    ).rejects.toThrow(ValidationError)
  })

  test('should fail if userProfile does not exist', () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      ensureValidRole: () => {},
      getUserRole: () => null,
    }

    containerRequestService.userProfileRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(
      containerRequestService.create(
        { _id: `User_${chance.guid()}` },
        validProject._id,
        ContainerRole.Viewer
      )
    ).rejects.toThrow(ValidationError)
  })

  test('should call create in containerRequestRepository', async () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      ensureValidRole: () => {},
      getUserRole: () => null,
    }

    containerRequestService.userProfileRepository = {
      getById: async () => Promise.resolve({}),
    }

    containerRequestService.containerRequestRepository = {
      create: jest.fn(),
      getById: () => Promise.resolve(null),
    }

    containerRequestService.userRepository = {
      getById: async () => Promise.resolve(validUser),
    }

    containerRequestService.emailService.sendContainerRequest = jest.fn()

    await containerRequestService.create(
      { _id: `User_${chance.guid()}` },
      validProject._id,
      ContainerRole.Viewer
    )

    return expect(containerRequestService.containerRequestRepository.create).toHaveBeenCalled()
  })

  test('should call patch in containerRequestRepository', async () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.projectService = {
      getContainer: async () => Promise.resolve(validProject),
      ensureValidRole: () => {},
      getUserRole: () => null,
    }

    containerRequestService.userProfileRepository = {
      getById: async () => Promise.resolve({}),
    }

    containerRequestService.containerRequestRepository = {
      patch: jest.fn(),
      getById: () => Promise.resolve({}),
    }

    containerRequestService.userRepository = {
      getById: async () => Promise.resolve(validUser),
    }

    containerRequestService.emailService.sendContainerRequest = jest.fn()

    await containerRequestService.create(
      { _id: `User_${chance.guid()}` },
      validProject._id,
      ContainerRole.Viewer
    )

    return expect(containerRequestService.containerRequestRepository.patch).toHaveBeenCalled()
  })
})

describe('ContainerRequestService - response', () => {
  test('should fail if request does not exist', () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.containerRequestRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(
      containerRequestService.response(chance.guid(), { _id: `User_${chance.guid()}` }, false)
    ).rejects.toThrow(ValidationError)
  })

  test('should fail if requesting user does not exist', () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.containerRequestRepository = {
      getById: async () => Promise.resolve({ userID: `User_${chance.guid()}` }),
    }

    containerRequestService.userRepository = {
      getById: async () => Promise.resolve(null),
    }

    return expect(
      containerRequestService.response(chance.guid(), { _id: `User_${chance.guid()}` }, false)
    ).rejects.toThrow(ValidationError)
  })

  test('should fail if user is not owner', () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.containerRequestRepository = {
      getById: async () =>
        Promise.resolve({
          userID: `User_${chance.guid()}`,
          containerID: validProject._id,
        }),
    }

    containerRequestService.userRepository = {
      getById: async () => Promise.resolve({}),
    }

    containerRequestService.projectService = {
      getContainer: async () => Promise.resolve({ owners: [], _id: validProject._id }),
      isOwner: () => false,
    }

    return expect(
      containerRequestService.response(chance.guid(), { _id: `User_${chance.guid()}` }, false)
    ).rejects.toThrow(RoleDoesNotPermitOperationError)
  })

  test('should fail if requesting user has a less limiting role', () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.containerRequestRepository = {
      getById: async () =>
        Promise.resolve({
          userID: `User_${chance.guid()}`,
          containerID: validProject._id,
        }),
      remove: jest.fn(),
    }

    containerRequestService.userRepository = {
      getById: async () => Promise.resolve({ containerID: validProject._id }),
    }

    containerRequestService.projectService = {
      getContainer: async () => Promise.resolve({ owners: [], _id: validProject._id }),
      isOwner: () => true,
      getUserRole: () => ContainerRole.Owner,
    }

    return expect(
      containerRequestService.response(chance.guid(), { _id: `User_${chance.guid()}` }, true)
    ).rejects.toThrow(RoleDoesNotPermitOperationError)
  })

  test('should accept access request to the project', async () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.containerRequestRepository = {
      getById: async () =>
        Promise.resolve({
          userID: 'User_random-id',
          containerID: validProject._id,
        }),
      remove: jest.fn(),
    }

    containerRequestService.userRepository = {
      getById: async () => Promise.resolve({ _id: 'User|random-id' }),
    }

    containerRequestService.projectService = {
      getContainer: async () =>
        Promise.resolve({
          owners: ['User_random-id-2'],
          _id: validProject._id,
        }),
      addContainerUser: jest.fn(),
      isOwner: () => true,
      getUserRole: () => null,
    }

    containerRequestService.emailService.requestResponse = jest.fn()

    await containerRequestService.response(chance.guid(), { _id: 'User_random-id-2' }, true)

    expect(containerRequestService.projectService.addContainerUser).toHaveBeenCalled()
    expect(containerRequestService.containerRequestRepository.remove).toHaveBeenCalled()
    expect(containerRequestService.emailService.requestResponse).toHaveBeenCalled()
  })

  test('should accept access request to the project and update the user role', async () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.containerRequestRepository = {
      getById: async () =>
        Promise.resolve({
          userID: `User_${chance.guid()}`,
          role: ContainerRole.Writer,
          containerID: validProject._id,
        }),
      remove: jest.fn(),
    }

    containerRequestService.userRepository = {
      getById: async () => Promise.resolve({}),
    }

    containerRequestService.projectService = {
      getContainer: async () =>
        Promise.resolve({
          owners: ['User_random-id-2'],
          _id: validProject._id,
        }),
      updateContainerUser: jest.fn(),
      isOwner: () => true,
      getUserRole: () => ContainerRole.Viewer,
    }

    containerRequestService.emailService.requestResponse = jest.fn()

    await containerRequestService.response(chance.guid(), { _id: 'User_random-id-2' }, true)

    expect(containerRequestService.projectService.updateContainerUser).toHaveBeenCalled()
    expect(containerRequestService.containerRequestRepository.remove).toHaveBeenCalled()
    expect(containerRequestService.emailService.requestResponse).toHaveBeenCalled()
  })

  test('should reject access request to the project', async () => {
    const containerRequestService: any = DIContainer.sharedContainer.containerRequestService

    containerRequestService.containerRequestRepository = {
      getById: async () =>
        Promise.resolve({
          userID: `User_${chance.guid()}`,
          containerID: validProject._id,
        }),
      remove: jest.fn(),
    }

    containerRequestService.userRepository = {
      getById: async () => Promise.resolve({}),
    }

    containerRequestService.projectService = {
      getContainer: async () =>
        Promise.resolve({
          owners: ['User_random-id-2'],
          _id: validProject._id,
        }),
      addContainerUser: jest.fn(),
      isOwner: () => true,
      isContainerUser: () => false,
    }

    containerRequestService.emailService.requestResponse = jest.fn()

    await containerRequestService.response(chance.guid(), { _id: 'User_random-id-2' }, false)

    expect(containerRequestService.projectService.addContainerUser).not.toHaveBeenCalled()
    expect(containerRequestService.containerRequestRepository.remove).toHaveBeenCalled()
    expect(containerRequestService.emailService.requestResponse).toHaveBeenCalled()
  })
})
