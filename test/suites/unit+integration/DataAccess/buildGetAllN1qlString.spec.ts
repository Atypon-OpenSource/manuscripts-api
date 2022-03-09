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

import '../../../../test/utilities/dbMock'

import { SQLDatabase } from '../../../../src/DataAccess/SQLDatabase'
import { UserRepository } from '../../../../src/DataAccess/UserRepository/UserRepository'
import { config } from '../../../../src/Config/Config'
import { BucketKey } from '../../../../src/Config/ConfigurationTypes'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

function testDatabase (): any {
  return new SQLDatabase(config.DB, BucketKey.User)
}

describe('SQLRepository buildGetAllN1qlString', () => {
  test('should return query with _type only', async () => {
    const repository = new UserRepository(testDatabase())
    const statement = repository.getAllQuery(null, null)

    expect((statement as any).options.statement).toBe('SELECT * FROM `BUCKET_NAME` WHERE _type = \'User')
  })

  test('should return query without (offset, limit, sort)', async () => {
    const repository = new UserRepository(testDatabase())
    const query = {
      N1QL: 'name = $1 AND email = $2 AND _type = $3',
      params: ['User', 'Abdallah', 'abarmawi@live.com', 'User']
    }
    const statement = repository.getAllQuery(query, null)

    expect((statement as any).options.statement).toBe('SELECT * FROM \`BUCKET_NAME\` WHERE name = $1 AND email = $2 AND _type = $3')
  })

  test('should return query with (offset) and without (limit, sort)', async () => {
    const repository = new UserRepository(testDatabase())
    const query = {
      N1QL: 'name = $1 AND email = $2 AND _type = $3',
      params: ['Abdallah', 'abarmawi@live.com', 'User']
    }

    const statement = repository.getAllQuery(query, { skip: 100, limit: null, ascOrderBy: [], descOrderBy: [] })

    expect((statement as any).options.statement).toBe('SELECT * FROM \`BUCKET_NAME\` WHERE name = $1 AND email = $2 AND _type = $3 OFFSET 100')
  })

  test('should return query with (offset, limit) and without (sort)', async () => {
    const repository = new UserRepository(testDatabase())
    const query = {
      N1QL: 'name = $1 AND email = $2 AND _type = $3',
      params: ['Abdallah', 'abarmawi@live.com', 'User']
    }

    const statement = repository.getAllQuery(query, { skip: 100, limit: 20, ascOrderBy: [], descOrderBy: [] })

    expect((statement as any).options.statement).toBe('SELECT * FROM \`BUCKET_NAME\` WHERE name = $1 AND email = $2 AND _type = $3 OFFSET 100 LIMIT 20')
  })

  test('should return query with (offset, limit, sort(asc, desc))', async () => {
    const repository = new UserRepository(testDatabase())
    const query = {
      N1QL: 'name = $1 AND email = $2 AND _type = $3',
      params: ['Abdallah', 'abarmawi@live.com', 'User']
    }

    const statement = repository.getAllQuery(query, { skip: 100, limit: 20, ascOrderBy: ['name'], descOrderBy: ['email'] })

    expect((statement as any).options.statement).toBe('SELECT * FROM \`BUCKET_NAME\` WHERE name = $1 AND email = $2 AND _type = $3 OFFSET 100 LIMIT 20 ORDER BY name ASC, email DESC')
  })

  test('should return query with (offset, limit, sort(asc))', async () => {
    const repository = new UserRepository(testDatabase())
    const query = {
      N1QL: 'name = $1 AND email = $2 AND _type = $3',
      params: ['Abdallah', 'abarmawi@live.com']
    }
    const statement = repository.getAllQuery(query, { skip: 100, limit: 20, ascOrderBy: ['name'], descOrderBy: [] })

    expect((statement as any).options.statement).toBe('SELECT * FROM \`BUCKET_NAME\` WHERE name = $1 AND email = $2 AND _type = $3 OFFSET 100 LIMIT 20 ORDER BY name ASC')
  })

  test('should return query with (offset, limit, sort(desc))', async () => {
    const repository = new UserRepository(testDatabase())
    const query = {
      N1QL: 'name = $1 AND email = $2 AND _type = $3',
      params: ['Abdallah', 'abarmawi@live.com', 'User']
    }
    const statement = repository.getAllQuery(query, { skip: 100, limit: 20, ascOrderBy: [], descOrderBy: ['name'] })

    expect((statement as any).options.statement).toBe('SELECT * FROM \`BUCKET_NAME\` WHERE name = $1 AND email = $2 AND _type = $3 OFFSET 100 LIMIT 20 ORDER BY name DESC')
  })
})
