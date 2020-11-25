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
import Chance from 'chance'

import { ContainerRequestController } from '../../../../../../src/Controller/V1/ContainerRequest/ContainerRequestController'
import { ValidationError } from '../../../../../../src/Errors'
import { ContainerRole } from '../../../../../../src/Models/ContainerModels'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)
const chance = new Chance()

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('ContainerRequestController - create', () => {
  test('should fail if containerID is not string', () => {
    const containerRequestController: any = new ContainerRequestController()

    const req: any = {
      user: {
        _id: chance.guid()
      },
      body: {
        role: ContainerRole.Viewer
      },
      params: {
        containerID: chance.integer()
      }
    }

    return expect(containerRequestController.create(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should fail if the role is not of ContainerRole type', () => {
    const containerRequestController: any = new ContainerRequestController()

    const req: any = {
      user: {
        _id: chance.guid()
      },
      body: {
        role: 'Samurai'
      },
      params: {
        containerID: chance.guid()
      }
    }

    return expect(containerRequestController.create(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('should call create method on the container request service', async () => {
    const containerRequestService: any =
      DIContainer.sharedContainer.containerRequestService

    const req: any = {
      user: {
        _id: chance.guid()
      },
      body: {
        role: ContainerRole.Writer
      },
      params: {
        containerID: chance.guid()
      }
    }

    containerRequestService.create = jest.fn()

    const containerRequestController: any = new ContainerRequestController()

    await containerRequestController.create(req)

    expect(containerRequestService.create).toBeCalled()
  })
})

describe('ContainerRequestController - response', () => {
  test('should fail if containerID is not string', () => {
    const containerRequestController: any = new ContainerRequestController()

    const req: any = {
      user: {
        _id: chance.guid()
      },
      body: {
        requestID: chance.guid()
      },
      params: {
        containerID: 123
      }
    }

    return expect(
      containerRequestController.response(req, true)
    ).rejects.toThrowError(ValidationError)
  })

  test('should fail if requestID is not string', () => {
    const containerRequestController: any = new ContainerRequestController()

    const req: any = {
      user: {
        _id: chance.guid()
      },
      body: {
        requestID: chance.integer()
      },
      params: {
        containerID: chance.guid()
      }
    }

    return expect(
      containerRequestController.response(req, true)
    ).rejects.toThrowError(ValidationError)
  })

  test('should call response method on the container request service', async () => {
    const containerRequestService: any =
      DIContainer.sharedContainer.containerRequestService

    const req: any = {
      user: {
        _id: 'foo'
      },
      body: {
        requestID: chance.guid()
      },
      params: {
        containerID: chance.guid()
      }
    }

    containerRequestService.response = jest.fn()

    const containerRequestController: any = new ContainerRequestController()

    await containerRequestController.response(req)

    expect(containerRequestService.response).toBeCalled()
  })
})
