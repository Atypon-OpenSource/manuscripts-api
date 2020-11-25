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

import { Database } from '../../../../src/DataAccess/Database'
import { config } from '../../../../src/Config/Config'
import { BucketKey } from '../../../../src/Config/ConfigurationTypes'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

function testDatabase (): any {
  return new Database(config.DB, BucketKey.User)
}

describe('IndexBuilder', () => {
  const indexingArray = [{
    name: 'IX_PRIMARY_DEFAULT',
    script: `CREATE PRIMARY INDEX \`IX_PRIMARY_DEFAULT\` ON \`Bucket_Name\` USING GSI;`
  }]

  test('should fail if error occurred while checking if index exists or not', () => {
    const errorObj = new Error('database derp')

    const db = testDatabase()

    db._bucket = {
      query: (_q: any, _o: any, callback: Function) => {
        callback(errorObj, null)
      }
    }

    return expect(db.buildIndices(indexingArray)).rejects.toThrow()
  })

  test('should not fail if index already exists', async () => {
    const db = testDatabase()

    db._bucket = {
      query: (_q: any, _o: any, callback: Function) => {
        callback(null, [{}])
      }
    }

    return expect(db.buildIndices(indexingArray)).resolves.not.toThrow()
  })

  test('should create index if it does not exist', async () => {
    const db = testDatabase()

    db._bucket = {
      query: (_q: any, _o: any, callback: Function) => {
        callback(null, [])
      }
    }

    return expect(db.buildIndices(indexingArray)).resolves.not.toThrow()
  })

  test('should fail if error occurred while creating index', () => {
    const errorObj = new Error('error occurred while creating index')

    const db = testDatabase()

    db._bucket = {
      query: (_q: any, _o: any, callback: Function) => {
        callback(null, [])
        // buildIndices calls ottoman.query twice.
        // To visit the method fully in tests, we make the first case to be success and the 2nd case to fail.
        // We re-create/assign the implementation of queryMockedFunction to lead to an error after the first success case.
        db._bucket = {
          query: (_q: any, _o: any, callback: Function) => {
            callback(errorObj, null)
          }
        }
      }
    }

    return expect(db.buildIndices(indexingArray)).rejects.toThrow()
  })
})
