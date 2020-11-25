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

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { UserRepository } from '../../../../../src/DataAccess/UserRepository/UserRepository'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { testDatabase } from '../../../../utilities/db'
import { NoBucketError, NoDocumentMapperError, DatabaseError, RecordNotFoundError } from '../../../../../src/Errors'
import { validUser1, validNewUser } from '../../../../data/fixtures/UserRepository'
import { DatabaseView } from '../../../../../src/DataAccess/DatabaseView'
import { UserStatusViewFunctionDocument } from '../../../../../src/Models/UserModels'
import { ViewMapFunctionMeta, ViewReducer } from '../../../../../src/Models/DatabaseViewModels'
import { UserStatusRepository } from '../../../../../src/DataAccess/UserStatusRepository/UserStatusRepository'

jest.setTimeout(TEST_TIMEOUT)
const chance = new Chance()

let db: any = null

beforeAll(async () => db = await testDatabase())
afterAll(() => { if (db && db.bucket && db.bucket.disconnect) { db.bucket.disconnect() } })

function mockBuildViews () {
  const failedLoginCountView: DatabaseView = {
    name: 'failedLoginCount',
    map: function (doc: UserStatusViewFunctionDocument, _meta: ViewMapFunctionMeta) {
      if (doc._type === 'UserEvent' && (doc.eventType === 'SuccessfulLogin' || doc.eventType === 'FailedLogin')) {
        emit(doc.userId, doc)
      }
    },
    reduce: function (_key: string, values: UserStatusViewFunctionDocument[], _rereduce: ViewReducer) {

      values.sort((a: UserStatusViewFunctionDocument, b: UserStatusViewFunctionDocument) => {
        return b.timestamp - a.timestamp
      })

      let failedCount = 0
      values.forEach(function (doc: any) {
        if (doc.eventType === 2) {
          return false
        }
        failedCount++
      })

      return failedCount
    }
  }

  return [failedLoginCountView]
}

describe('CBRepository model (with mocked database)', () => {
  test('should fail if database is null', () => {
    return expect(() => {
      const repository: any = new UserRepository(db)
      repository.database = null
      const model = repository.model
      fail(`this line should never have been visited with ${model}`)
    }).toThrow()
  })

  test('should fail if database.documentMapper is null', () => {
    return expect(() => {
      const repository: any = new UserRepository(db)
      repository.database = {}
      const model = repository.model
      fail(`this line should never have been visited with ${model}`)
    }).toThrowError(NoDocumentMapperError)
  })

  test('should return model successfully', async () => {
    (DIContainer as any)._sharedContainer = null
    await DIContainer.init()
    db = await testDatabase()
    const repository = new UserRepository(db)
    const model = repository.model

    expect(model).toBeDefined()
  })
})

describe('CBRepository bucketName (with mocked database)', () => {
  test('should fail if database.bucket is null', () => {
    return expect(() => {
      const repository: any = new UserRepository(db)
      repository.database = {}
      const bucketName = repository.bucketName
      fail(`this line should never have been visited with ${bucketName}`)
    }).toThrowError(NoBucketError)
  })

  test('should return bucketName successfully', async () => {
    db = await testDatabase()
    const repository = new UserRepository(db)
    const bucketName = repository.bucketName
    const bucket: any = db.bucket
    expect(bucketName).toBe(bucket._name)
  })
})

describe('CBRepository create (with mocked database)', () => {
  beforeEach(async () => db = await testDatabase())

  test('should fail and error type should be number', async () => {
    db = await testDatabase()
    const repository: any = new UserRepository(db)
    const numericErrorCode = 30

    repository.modelConstructor = {
      schema: {
        validate: (_document: any, cb: Function) => cb(null)
      }
    }
    db.bucket.insert.mockImplementationOnce((_id: any, _doc: any, _opts: any, cb: Function) => {
      cb(numericErrorCode, null)
    })

    return expect(repository.create(validNewUser)).rejects.toThrowError(DatabaseError)
  })
})

describe('CBRepository getById (with mocked database)', () => {
  beforeEach(async () => db = await testDatabase())

  test('should fail if error occurred', async () => {
    db = await testDatabase()
    const repository = new UserRepository(db)
    const id = chance.hash()
    const errorObject = new Error('database derp')

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObject, null)
    })

    return expect(repository.getById(id)).rejects.toThrowError(DatabaseError)
  })
})

describe('CBRepository getOne (with mocked database)', () => {
  beforeEach(async () => db = await testDatabase())

  test('should fail if error occurred', () => {
    const repository = new UserRepository(db)
    const errorObject = new Error('database derp')

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObject, null)
    })

    return expect(repository.getOne({})).rejects.toThrowError(DatabaseError)
  })
})

describe('CBRepository count (with mocked database)', () => {
  beforeEach(async () => db = await testDatabase())

  test('should fail if error occurred', () => {
    const repository = new UserRepository(db)
    const errorObject = new Error('database derp')

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => { cb(errorObject, null) })
    return expect(repository.count({})).rejects.toThrowError(DatabaseError)
  })
})

describe('CBRepository getAll (with mocked database)', () => {
  beforeEach(async () => db = await testDatabase())

  test('should fail if error occurred', () => {
    const repository = new UserRepository(db)
    const errorObject = new Error('database derp')

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObject, null)
    })

    return expect(repository.getAll({}, null)).rejects.toThrowError(DatabaseError)
  })
})

describe('CBRepository remove (with mocked database)', () => {
  beforeEach(async () => db = await testDatabase())

  test('should fail if error occurred', () => {
    const repository = new UserRepository(db)
    const errorObject = new Error('database derp')

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObject, null)
    })

    return expect(repository.remove({})).rejects.toThrowError(DatabaseError)
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
  test('should fail if error occurred - error type is number', () => {
    const repository: any = new UserRepository(db)

    db.bucket.replace = (_id: any, _doc: any, _opts: any, cb: Function) => {
      cb(20, {})
    }

    repository.modelConstructor = {
      schema: {
        validate: function (_model: any, callback: Function) {
          callback()
        }
      }
    }

    return expect(repository.update(validUser1)).rejects.toThrowError(DatabaseError)
  })
})

describe('CBRepository patch (with mocked database)', () => {
  test('should fail if document doesn\'t exists', () => {
    const repository = new UserRepository(db)
    const id = chance.hash()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(null, [])
    })

    return expect(repository.patch(id, { }, {})).rejects.toThrowError(RecordNotFoundError)
  })
})

describe('CBRepository buildDesignDocument (with mocked database)', () => {
  test('should return design document view with reduce function', async () => {
    (DIContainer.sharedContainer.userStatusRepository as any).buildViews = mockBuildViews
    const databaseView = (DIContainer.sharedContainer.userStatusRepository as any).buildDesignDocument()

    expect(databaseView.views.failedLoginCount.reduce).toBeDefined()
  })

  test('should return design document view without reduce function', async () => {
    (DIContainer.sharedContainer.userStatusRepository as any).buildViews = () => {
      const designDocument = mockBuildViews()
      const failedLoginCount = designDocument[0]
      failedLoginCount.reduce = null

      return [failedLoginCount]
    }

    const databaseView = (DIContainer.sharedContainer.userStatusRepository as any).buildDesignDocument()

    expect(databaseView.views.failedLoginCount.reduce).not.toBeDefined()
  })
})

describe('CBRepository pushDesignDocument (with mocked database)', () => {
  test('should create new design document if it does not exists', async () => {
    db.getDesignDocument = () => null
    const repository = new UserStatusRepository(db)

    await repository.pushDesignDocument()

    expect(db.createDesignDocument).toBeCalled()
  })

  test('should create new design document if databaseDesignDocument.viewsStatus does not exists', async () => {
    db.getDesignDocument = () => {
      return {
      }
    }
    const repository = new UserStatusRepository(db)

    await repository.pushDesignDocument()

    expect(db.createDesignDocument).toBeCalled()
  })

  test('should create new design documents if checkSum is invalid', async () => {
    const repository = new UserStatusRepository(db)
    db.getDesignDocument = () => {
      return {
        viewsStatus: {
          'failedLoginCount': '123'
        }
      }
    }

    await repository.pushDesignDocument()

    expect(db.createDesignDocument).toBeCalled()
  })
})
