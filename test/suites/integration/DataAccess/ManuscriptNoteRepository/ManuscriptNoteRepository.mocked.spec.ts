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

import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { testDatabase } from '../../../../utilities/db'
import { ManuscriptNoteRepository } from '../../../../../src/DataAccess/ManuscriptNoteRepository/ManuscriptNoteRepository'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { DatabaseError, NoBucketError } from '../../../../../src/Errors'
import { UserRepository } from '../../../../../src/DataAccess/UserRepository/UserRepository'
import { Chance } from 'chance'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => db = await testDatabase())
afterAll(() => { if (db && db.bucket && db.bucket.disconnect) { db.bucket.disconnect() } })
describe('ManuscriptNoteRepository getProductionNotes', () => {
  test('should fail if invalid data', async () => {
    const repository = new ManuscriptNoteRepository(BucketKey.Data, db)
    const errorObject = {
      message: 'Internal database error occurred. Operation = fetchData',
      code: 400
    }
    db.bucket.query.mockImplementationOnce((_q: any, _p: any[]) => {
      return Promise.reject(errorObject)
    })
    await expect(repository.getProductionNotes('invalidContainerID', 'invalidManuscriptID')).rejects.toThrow(DatabaseError)
  })

  test('should fail if database.documentMapper not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}
    const chance = new Chance()
    const id = chance.hash()
    return expect(repository.touch(id, 100)).rejects.toThrowError(NoBucketError)
  })
})
