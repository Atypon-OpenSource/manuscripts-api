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

import { Chance } from 'chance'
import '../../../../../utilities/dbMock'

import { SubmissionController } from '../../../../../../src/Controller/V1/Submission/SubmissionController'
import { ValidationError } from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('SubmissionContriller - updateStatus', () => {
  test('should call updateStatus', async () => {
    const submissionService: any =
      DIContainer.sharedContainer.submissionService
    const chance = new Chance()
    const req: any = {
      body: {
        eventKey: chance.string(),
        eventMessage: chance.string()
      },
      params: { id: chance.guid() }
    }

    submissionService.updateStatus = jest.fn()

    const submissionController: SubmissionController = new SubmissionController()
    await submissionController.updateStatus(req)

    expect(submissionService.updateStatus).toBeCalledWith(
      req.params.id,
      req.body.eventKey
    )
  })

  test('updateStatus should fail if the id is not a string', () => {
    const chance = new Chance()
    const req: any = {
      body: {
        eventKey: chance.string()
      },
      params: { id: chance.integer() }
    }

    const submissionController: SubmissionController = new SubmissionController()
    return expect(submissionController.updateStatus(req)).rejects.toThrowError(
      ValidationError
    )
  })

  test('updateStatus should fail if eventKey in not string', () => {
    const chance = new Chance()
    const req: any = {
      body: {
        eventKey: chance.integer()
      },
      params: { id: chance.guid() }
    }

    const submissionController: SubmissionController = new SubmissionController()
    return expect(submissionController.updateStatus(req)).rejects.toThrowError(
      ValidationError
    )
  })
})
