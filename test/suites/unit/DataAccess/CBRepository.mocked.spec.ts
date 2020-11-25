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
import '../../../utilities/dbMock'

import { UserRepository } from '../../../../src/DataAccess/UserRepository/UserRepository'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'
import { testDatabase } from '../../../utilities/db'
import { NoBucketError, NoDocumentMapperError, DatabaseError } from '../../../../src/Errors'

jest.setTimeout(TEST_TIMEOUT)
const chance = new Chance()

let db: any = null
beforeEach(async () => db = await testDatabase())
afterEach(() => { if (db && db.bucket && db.bucket.disconnect) { db.bucket.disconnect() } })

describe('CBRepository model (with mocked database)', () => {
  test('should return model successfully', () => {
    const repository = new UserRepository(db)
    const model = repository.model

    return expect(model).toBeDefined()
  })

  test('should fail if database is null', () => {
    return expect(() => {
      const repository: any = new UserRepository(db)
      repository.database = null
      const model = repository.model
      fail(`this line should not be reached: ${model}`)
    }).toThrow()
  })

  test('should fail if database.documentMapper is null', () => {
    return expect(() => {
      const repository: any = new UserRepository(db)
      repository.database = {}
      const model = repository.model

      fail('this line should not be reached')
      fail(model)
    }).toThrowError(NoDocumentMapperError)
  })
})

describe('CBRepository bucketName (with mocked database)', () => {
  test('should fail if database.bucket is null', () => {
    return expect(() => {
      const repository: any = new UserRepository(db)
      repository.database = {}
      const bucketName = repository.bucketName

      fail('this line should not be reached')
      fail(bucketName)
    }).toThrowError(NoBucketError)
  })

  test('should return bucketName successfully', () => {
    const repository = new UserRepository(db)
    const bucketName = repository.bucketName
    const bucket: any = db.bucket
    return expect(bucketName).toBe(bucket._name)
  })
})

describe('CBRepository getById (with mocked database)', () => {
  test('should fail if error occurred', () => {
    const repository = new UserRepository(db)
    const id = chance.hash()
    const errorObject = {
      message: 'Internal database error occurred. Operation = getById',
      code: 10020
    }

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObject, null)
    })

    return expect(repository.getById(id)).rejects.toThrow()
  })
})

describe('CBRepository getOne (with mocked database)', () => {
  test('should fail if error occurred', () => {
    const repository = new UserRepository(db)
    const errorObject = {
      message: 'Internal database error occurred. Operation = getOne',
      code: 10020
    }

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObject, null)
    })

    return expect(repository.getOne({})).rejects.toThrow()
  })
})

describe('CBRepository count (with mocked database)', () => {
  test('should fail if error occurred', () => {
    const repository = new UserRepository(db)
    const errorObject = {
      message: 'Internal database error occurred. Operation = count',
      code: 10020
    }

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObject, null)
    })

    return expect(repository.count({})).rejects.toThrow()
  })
})

describe('CBRepository getAll (with mocked database)', () => {
  test('should fail if error occurred', () => {
    const repository = new UserRepository(db)
    const errorObject = {
      message: 'Internal database error occurred. Operation = getAll',
      code: 10020
    }

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObject, null)
    })

    return expect(repository.getAll({}, null)).rejects.toThrow()
  })
})

describe('CBRepository remove (with mocked database)', () => {
  test('should fail if error occurred', () => {
    const repository = new UserRepository(db)
    const errorObject = {
      message: 'Internal database error occurred. Operation = remove',
      code: 10020
    }

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObject, null)
    })

    return expect(repository.remove({})).rejects.toThrow()
  })
})

describe('CBRepository touch (with mocked database)', () => {
  test('should fail if error occurred - error type is number', () => {
    const repository = new UserRepository(db)
    const id = chance.hash()

    db.bucket.touch = (_key: any, _expiry: any, _options: any, callback: Function) => {
      callback(20)
    }

    return expect(repository.touch(id, 100)).rejects.toThrowError(DatabaseError)
  })
})

describe('CBRepository update (with mocked database)', () => {
  test('should fail if an error ocurred - error type is number', () => {
    const repository: any = new UserRepository(db)
    const id = chance.hash()

    db.bucket.replace = (_id: any, _doc: any, _opts: any, cb: Function) => {
      cb(20, {})
    }

    repository.modelConstructor = {
      schema: {
        validate: (_model: any, callback: Function) => callback()
      }
    }

    return expect(repository.update({ _id: id })).rejects.toThrow(DatabaseError)
  })
})

describe('CBRepository patch (with mocked database)', () => {
  test('should fail if document doesn\'t exists', () => {
    const repository = new UserRepository(db)
    const id = chance.hash()

    let mockedModel: any = repository.model
    mockedModel.getById = (_id: string, callback: Function) => {
      callback(null, null)
    }

    return expect(repository.patch(id, { _id: id }, {})).rejects.toThrow()
  })
})
