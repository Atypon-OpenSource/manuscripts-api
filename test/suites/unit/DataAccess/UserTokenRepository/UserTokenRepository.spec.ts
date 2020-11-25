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

import { UserTokenRepository } from '../../../../../src/DataAccess/UserTokenRepository/UserTokenRepository'
import { UserTokenQueryCriteria } from '../../../../../src/DataAccess/Interfaces/QueryCriteria'
import { validUserToken } from '../../../../data/fixtures/UserTokenRepository'

import { Database } from '../../../../../src/DataAccess/Database'
import { config } from '../../../../../src/Config/Config'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

function testDatabase (): any {
  return new Database(config.DB, BucketKey.User)
}

describe('UserTokenRepository', () => {
  test('documentType', () => {
    const repository = new UserTokenRepository(testDatabase())
    expect(repository.documentType).toBe('UserToken')
  })

  test('should return empty N1QL if query is empty', () => {
    const repository = new UserTokenRepository(testDatabase())

    const n1ql = repository.whereClause(null)
    expect(n1ql.N1QL).toBe('_type = $1')
    expect(n1ql.params).toEqual(['UserToken'])
  })

  test('should add userId to query', () => {
    const repository = new UserTokenRepository(testDatabase())
    const query: UserTokenQueryCriteria = {
      userId: 'e5a6e6eb0bb3be70641c6714fad6b726610d2e3c'
    }

    const n1ql = repository.whereClause(query)
    expect(n1ql.N1QL).toBe('userId = $1 AND _type = $2')
    expect(n1ql.params).toEqual(['e5a6e6eb0bb3be70641c6714fad6b726610d2e3c', 'UserToken'])
  })

  test('should build user model from row object', () => {
    const repository = new UserTokenRepository(testDatabase())
    const user = repository.buildModel(validUserToken)

    expect(user._id).toBe(validUserToken._id)
    expect(user.token).toBe(validUserToken.token)
  })
})
