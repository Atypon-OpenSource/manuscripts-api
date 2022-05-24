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


jest.mock('../../src/DataAccess/SQLDatabase', () => {
  return {
    SQLDatabase: jest.fn(() => ({
      loadDatabaseModels: jest.fn(),
      createDesignDocument: jest.fn(),
      getDesignDocument: jest.fn(),
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
        insert: jest.fn((_doc: any) => Promise.resolve(null)),
        insertMany: jest.fn((_doc: any) => Promise.resolve(null)),
        query: jest.fn((_query: any) => Promise.resolve([])),
        findMany: jest.fn((_query: any) => Promise.resolve([])),
        remove: jest.fn((_query: any) => Promise.resolve([])),
        count: jest.fn((_query: any) => Promise.resolve(0)),
        findFirst: jest.fn((_query: any) => Promise.resolve(null)),
        findUnique: jest.fn((_query: any) => Promise.resolve(null)),
        touch: jest.fn((_key: any | Buffer, _expiry: number, _options: any, callback: any) => callback(null, null)),
        replace: jest.fn((_id: String, _document: any) => Promise.resolve(null)),
        upsert: jest.fn((_id: String, _document: any) => Promise.resolve(null)),
        _name: 'BUCKET_NAME'
      }
    }))
  }
})

export {}