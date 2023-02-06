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

import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { ManuscriptNoteRepository } from '../../../../../src/DataAccess/ManuscriptNoteRepository/ManuscriptNoteRepository'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase(false, BucketKey.Project)))
afterAll(() => db.bucket.disconnect())

describe('ManuscriptNoteRepository getProductionNotes', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projects: true, manuscript: true, manuscriptNotes: true })
  })

  test('should fetch list of notes', async () => {
    const repository = new ManuscriptNoteRepository(BucketKey.Project, db)
    const data = await repository.getProductionNotes(
      'MPProject:valid-project-id-11',
      'MPManuscript:valid-manuscript-id-1'
    )
    expect(data).toBeTruthy()
    expect(data.length).toBeGreaterThan(0)
  })
})
