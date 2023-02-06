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

import { config } from '../../../../../src/Config/Config'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { SQLDatabase } from '../../../../../src/DataAccess/SQLDatabase'
import { UserRepository } from '../../../../../src/DataAccess/UserRepository/UserRepository'
import { validUser1 } from '../../../../data/fixtures/UserRepository'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

function testDatabase(): any {
  return new SQLDatabase(config.DB, BucketKey.User)
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

  test('should build user model from row object', () => {
    const repository = new UserRepository(testDatabase())
    const user = repository.buildModel({ id: validUser1._id, ...validUser1 })

    expect(user._id).toBe(validUser1._id)
    expect(user.email).toBe(validUser1.email)
    expect(user.name).toBe(validUser1.name)
  })
})
