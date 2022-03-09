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
import '../../../../utilities/dbMock'

import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { testDatabase } from '../../../../utilities/db'
import { UserStatusRepository } from '../../../../../src/DataAccess/UserStatusRepository/UserStatusRepository'

const chance = new Chance()
jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => db = await testDatabase())
afterAll(() => { if (db && db.bucket && db.bucket.disconnect) { db.bucket.disconnect() } })

xdescribe('UserStatusRepository failedLoginCount', () => {
  test('should fail if error occurred', async () => {
    const repository = new UserStatusRepository(db)
    const errorObject = {
      message: 'Internal database error occurred. Operation = failedLoginCount',
      code: 10020
    }
    db.bucket.query.mockImplementationOnce((_q: any, cb: Function) => {
      cb(errorObject, null)
    })

    return expect(repository.failedLoginCount(chance.hash())).rejects.toThrowError()
  })

  test('should fail if returned value is not a number', () => {
    const repository = new UserStatusRepository(db)
    const rows = [{
      value: 'abc'
    }]
    db.bucket.query.mockImplementationOnce((_q: any, cb: Function) => {
      cb(null, rows)
    })

    return expect(repository.failedLoginCount(chance.hash())).rejects.toThrow()
  })

  test('should return zero if no records found', async () => {
    const repository = new UserStatusRepository(db)
    const rows: any = []
    db.bucket.query.mockImplementationOnce((_q: any, cb: Function) => {
      cb(null, rows)
    })

    const failedLoginCount = await repository.failedLoginCount(chance.hash())

    expect(failedLoginCount).toBe(0)
  })

  test('should return numeric value', async () => {
    const repository = new UserStatusRepository(db)
    const rows: any = [{
      value: 3
    }]
    db.bucket.query.mockImplementationOnce((_q: any, cb: Function) => {
      cb(null, rows)
    })

    const failedLoginCount = await repository.failedLoginCount(chance.hash())

    expect(failedLoginCount).toBe(3)
  })
})
