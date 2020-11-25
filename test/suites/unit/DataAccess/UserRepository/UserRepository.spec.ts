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

import { UserRepository } from '../../../../../src/DataAccess/UserRepository/UserRepository'
import { UserQueryCriteria } from '../../../../../src/DataAccess/Interfaces/QueryCriteria'
import { validUser1 } from '../../../../data/fixtures/UserRepository'
import { Database } from '../../../../../src/DataAccess/Database'
import { config } from '../../../../../src/Config/Config'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

function testDatabase (): any {
  return new Database(config.DB, BucketKey.User)
}

describe('UserRepository', () => {
  test('documentType', () => {
    const repository = new UserRepository(testDatabase())
    expect(repository.documentType).toBe('User')
  })

  test('fullyQualifiedId', () => {
    const repository = new UserRepository(testDatabase())
    const schema = repository.fullyQualifiedId('e5a6e6eb0bb3be70641c6714fad6b726610d2e3c')
    expect(schema).toBe('User|e5a6e6eb0bb3be70641c6714fad6b726610d2e3c')
  })

  test('should return empty N1QL if query is empty', () => {
    const repository = new UserRepository(testDatabase())

    const n1ql = repository.whereClause(null)
    expect(n1ql.N1QL).toBe('_type = $1')
    expect(n1ql.params).toEqual(['User'])
  })

  test('should add ID to query', () => {
    const repository = new UserRepository(testDatabase())
    const query: UserQueryCriteria = {
      _id: 'e5a6e6eb0bb3be70641c6714fad6b726610d2e3c'
    }

    const n1ql = repository.whereClause(query)
    expect(n1ql.N1QL).toBe('_id = $1 AND _type = $2')
    expect(n1ql.params).toEqual([
      'e5a6e6eb0bb3be70641c6714fad6b726610d2e3c',
      'User'
    ])
  })

  test('should add email to query', () => {
    const repository = new UserRepository(testDatabase())
    const query: UserQueryCriteria = {
      _id: 'e5a6e6eb0bb3be70641c6714fad6b726610d2e3c',
      email: 'mebwisal@eja.az'
    }

    const n1ql = repository.whereClause(query)
    expect(n1ql.N1QL).toBe('_id = $1 AND email = $2 AND _type = $3')
    expect(n1ql.params).toEqual([
      'e5a6e6eb0bb3be70641c6714fad6b726610d2e3c',
      'mebwisal@eja.az',
      'User'
    ])
  })

  test('should add name to query', () => {
    const repository = new UserRepository(testDatabase())
    const query: UserQueryCriteria = {
      _id: 'e5a6e6eb0bb3be70641c6714fad6b726610d2e3c',
      email: 'mebwisal@eja.az',
      name: 'Ruby Dennis'
    }

    const n1ql = repository.whereClause(query)
    expect(n1ql.N1QL).toBe('_id = $1 AND email = $2 AND name = $3 AND _type = $4')
    expect(n1ql.params).toEqual([
      'e5a6e6eb0bb3be70641c6714fad6b726610d2e3c',
      'mebwisal@eja.az',
      'Ruby Dennis',
      'User'
    ])
  })

  test('should build user model from row object', () => {
    const repository = new UserRepository(testDatabase())
    const user = repository.buildModel(validUser1)

    expect(user._id).toBe(validUser1._id)
    expect(user.email).toBe(validUser1.email)
    expect(user.name).toBe(validUser1.name)
  })
})
