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

import { MissingSubmissionError, ValidationError } from '../../../../../../src/Errors'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { SubmissionStatus } from '../../../../../../src/Models/SubmissionModels'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

const chance = new Chance()
describe('Submission - updateStatus', () => {
  test('should fail if submission does not exist in the DB', () => {
    const submissionService: any =
      DIContainer.sharedContainer.submissionService
    submissionService.submissionRepository = {
      getById: async () => Promise.resolve(null)
    }

    return expect(
      submissionService.updateStatus(
        'submissionID',
        SubmissionStatus.SUCCESS,
        chance.string()
      )
    ).rejects.toThrowError(MissingSubmissionError)
  })

  test('should fail if status is invalid', () => {
    const submissionService: any =
      DIContainer.sharedContainer.submissionService
    submissionService.submissionRepository = {
      getById: async () => Promise.resolve({ _id: 'MPSubmission:some-id' })
    }

    return expect(
      submissionService.updateStatus(
        'MPSubmission:some-id',
        'confirmed',
        chance.string()
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('should patch submission status', async () => {
    const submissionService: any =
      DIContainer.sharedContainer.submissionService
    submissionService.submissionRepository = {
      getById: async () => Promise.resolve({ _id: 'MPSubmission:some-id' }),
      patch: jest.fn()
    }

    await submissionService.updateStatus(
      'MPSubmission:some-id',
      SubmissionStatus.SUCCESS,
      chance.string()
    )

    return expect(submissionService.submissionRepository.patch).toBeCalled()
  })
})
