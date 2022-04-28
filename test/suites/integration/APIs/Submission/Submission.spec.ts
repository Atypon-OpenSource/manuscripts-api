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

import * as HttpStatus from 'http-status-codes'
import * as supertest from 'supertest'

import { updateStatus } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import { ValidContentTypeAcceptJsonHeader } from '../../../../data/fixtures/headers'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { SubmissionStatus } from '../../../../../src/Models/SubmissionModels'
import { createSubmission } from '../../../../data/fixtures/misc'

let db: any = null
beforeAll(async () => {
  db = await testDatabase()
})

afterAll(async () => db.bucket.disconnect())

jest.setTimeout(TEST_TIMEOUT)

describe('SubmissionService - updateStatus', () => {
  beforeEach(async () => {
    const seedOptions: SeedOptions = {
      users: true,
      applications: true
    }

    await drop()
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
  })

  test('updateStatus should get update status field', async () => {
    await createSubmission('MPSubmission:valid-submission-id')
    const response: supertest.Response = await updateStatus(
      ValidContentTypeAcceptJsonHeader,
      {
        eventKey: SubmissionStatus.SUCCESS
      },
      { id: 'MPSubmission:valid-submission-id' }
    )

    expect(response.status).toBe(HttpStatus.OK)
    const submission = await DIContainer.sharedContainer.submissionRepository.getById(
      'MPSubmission:valid-submission-id'
    )

    expect(submission!.status).toEqual(SubmissionStatus.SUCCESS)
  })
})
