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

import { TouchOptions, Bucket, ViewQuery, N1qlQuery } from 'couchbase'

jest.mock('../../src/DataAccess/Database', () => {
  return {
    Database: jest.fn(() => ({
      loadDatabaseModels: jest.fn(),
      createDesignDocument: jest.fn(),
      getDesignDocument: jest.fn(),
      ensureSecondaryIndicesExist: jest.fn(),
      documentMapper: {
        ensureIndices: jest.fn((_DeferBuild: boolean, callback: Function) => {
          callback(null)
        }),
        model: jest.fn(),
        models: {
          User: {
            create: jest.fn(),
            getById: jest.fn(),
            fromData: jest.fn()
          }
        }
      },
      bucket: {
        insert: jest.fn((_key: any | Buffer, _value: any, callback: Bucket.OpCallback) => callback(null, null)),
        query: jest.fn((_query: ViewQuery | N1qlQuery, _params: Object | Array<any>, callback: Bucket.QueryCallback) => callback(null as any, [], { total_rows: 0 })),
        touch: jest.fn((_key: any | Buffer, _expiry: number, _options: TouchOptions, callback: Bucket.OpCallback) => callback(null, null)),
        replace: jest.fn((_id: String, _document: any, callback: Function) => callback(null)),
        upsert: jest.fn((_id: String, _document: any, callback: Function) => callback(null)),
        _name: 'BUCKET_NAME'
      }
    }))
  }
})
