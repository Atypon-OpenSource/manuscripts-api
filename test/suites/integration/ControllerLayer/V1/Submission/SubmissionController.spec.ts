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

import { ValidationError } from '../../../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { SubmissionController } from '../../../../../../src/Controller/V1/Submission/SubmissionController'

jest.setTimeout(TEST_TIMEOUT)

describe('SubmissionController - updateStatus', () => {
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
