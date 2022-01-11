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

import '../../../utilities/dbMock'

import { Chance } from 'chance'
import { N1qlQuery } from 'couchbase'
import { UserRepository } from '../../../../src/DataAccess/UserRepository/UserRepository'
import { UserQueryCriteria } from '../../../../src/DataAccess/Interfaces/QueryCriteria'
import { validUser1, validNewUser, NewUserNoId } from '../../../data/fixtures/UserRepository'
import { ensureTypeBound } from '../../../../src/DataAccess/Interfaces/IndexedRepository'
import { DatabaseError, ValidationError, NoBucketError, RecordNotFoundError, NoDocumentMapperError } from '../../../../src/Errors'
import { UserStatusRepository } from '../../../../src/DataAccess/UserStatusRepository/UserStatusRepository'
import { DatabaseDesignDocument, DatabaseView } from '../../../../src/DataAccess/DatabaseView'
import { UserStatusViewFunctionDocument } from '../../../../src/Models/UserModels'
import { ViewMapFunctionMeta, ViewReducer } from '../../../../src/Models/DatabaseViewModels'

import { Database } from '../../../../src/DataAccess/Database'
import { config } from '../../../../src/Config/Config'
import { BucketKey } from '../../../../src/Config/ConfigurationTypes'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

function mockbuildDesignDocument () {
  const designDocument: DatabaseDesignDocument = {
    name: 'UserStatus',
    viewsStatus: {
      'failedLoginCount': '17a6b47113b80d6d8b775f33d9fc60ff2fc8a2e1'
    },
    views: {}
  }

  return designDocument
}

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

function testDatabase (): any {
  return new Database(config.DB, BucketKey.User)
}

const chance = new Chance()
describe('CBRepository', () => {
  test('documentType', () => {
    const repository = new UserRepository(testDatabase())
    expect(repository.documentType).toBe('User')
  })

  test('should throw error if N1QL doesn\'t contain _type as part of the where clause', () => {
    expect(() => {
      ensureTypeBound(N1qlQuery.fromString('SELECT * FROM BUCKET WHERE age = 30'))
    }).toThrowError(ValidationError)
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
    expect(n1ql.params).toEqual(['e5a6e6eb0bb3be70641c6714fad6b726610d2e3c', 'User'])
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

    expect(user).toMatchSnapshot()
  })
})

describe('CBRepository Consistency', () => {
  // TODO: test NOT_BOUND after fixing typing issue
  test('should be REQUEST_PLUS', async () => {
    const repository = new UserRepository(testDatabase(), N1qlQuery.Consistency.REQUEST_PLUS)

    expect(repository.consistency).toBe(N1qlQuery.Consistency.REQUEST_PLUS)
  })

  test('should be REQUEST_PLUS', async () => {
    const repository = new UserRepository(testDatabase(), N1qlQuery.Consistency.REQUEST_PLUS)

    expect(repository.consistency).toBe(N1qlQuery.Consistency.REQUEST_PLUS)
  })
})

describe('CBRepository Create', () => {
  test('should fail if error occurred', () => {
    const db = testDatabase()

    const errorObj = new Error('database derp')
    const repository: any = new UserRepository(db)

    db.bucket.insert.mockImplementationOnce((_id: string, _document: any, _opts: any, cb: Function) => {
      cb(errorObj, null)
    })

    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null)
      }
    }

    const chance = new Chance()

    return expect(
      repository.create({
        email: chance.email(),
        name: chance.name()
      })
    ).rejects.toThrowError(DatabaseError)
  })

  test('should create user successfully', async () => {
    const db = testDatabase()
    const repository: any = new UserRepository(db)

    db.bucket.insert.mockImplementationOnce((_id: string, _document: any, _opts: any, cb: Function) => {
      cb(null)
    })

    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null)
      }
    }

    const user = await repository.create({
      _id: 'valid-user2@manuscriptsapp.com',
      email: 'valid-user2@manuscriptsapp.com',
      name: 'Valid System User'
    })

    expect(user).toMatchSnapshot()
  })

  test('should fail if database.documentMapper not set', () => {
    const db = testDatabase()
    const repository: any = new UserRepository(db)
    repository.database = {}
    return expect(repository.create(validUser1)).rejects.toThrowError(NoDocumentMapperError)
  })
})

describe('CBRepository patch', () => {
  test('should fail if database.documentMapper not set', () => {
    const db = testDatabase()
    const repository: any = new UserRepository(db)
    repository.database = {}
    const id = chance.hash()
    return expect(repository.patch(id, { name: chance.name() })).rejects.toThrowError()
  })

  test('should fail key not exists', () => {
    const db = testDatabase()
    const chance = new Chance()

    const errorObj = {
      message: 'An error occurred'
    }

    db.bucket.query.mockImplementationOnce((_statement: any, _params: any[], cb: Function) => {
      cb(errorObj, null)
    })

    const repository: any = new UserRepository(db)

    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null)
      }
    }

    return expect(
      repository.patch(validUser1._id, {
        name: chance.name()
      })
    ).rejects.toThrowError(DatabaseError)
  })

  test('should fail if id not exists', () => {
    const db = testDatabase()
    const chance = new Chance()

    db.bucket.query.mockImplementationOnce((_statement: any, _params: any[], cb: Function) => {
      cb(null, [])
    })

    const repository: any = new UserRepository(db)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null)
      }
    }

    return expect(
      repository.patch(validUser1._id, {
        name: chance.name()
      })
    ).rejects.toThrowError(RecordNotFoundError)
  })

  test('should fail if document _id is diffident than the passed id', () => {
    const db = testDatabase()
    const repository = new UserRepository(db)
    const chance = new Chance()

    return expect(
      repository.patch(validUser1._id, {
        _id: chance.string(),
        name: chance.name()
      }, {})
    ).rejects.toThrowError(ValidationError)
  })

  test('should fail if error occurred', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred'
    }

    db.bucket.query.mockImplementationOnce((_statement: any, _params: any[], cb: Function) => {
      cb(null, [{ [db.bucket._name]: validUser1 }])
    })

    db.bucket.upsert.mockImplementationOnce((_key: any, _document: any, _opts: any, cb: Function) => {
      cb(errorObj, null)
    })

    const repository: any = new UserRepository(db)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null)
      }
    }

    return expect(
      repository.patch(validUser1._id, {
        name: 'Cody Rodriquez'
      })
    ).rejects.toThrowError(DatabaseError)
  })

  test('should patch user data successfully', () => {
    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_statement: any, _params: any[], cb: Function) => {
      cb(null, [{ [db.bucket._name]: validUser1 }])
    })

    db.bucket.upsert.mockImplementationOnce((_key: any, _document: any, _opts: any, cb: Function) => {
      cb(null, null)
    })

    const repository: any = new UserRepository(db)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null)
      }
    }

    return expect(repository.patch(validUser1._id, { name: 'Cody Rodriquez' })).resolves.toMatchSnapshot()
  })
})

describe('CBRepository update', () => {
  test('should fail if id is not specified', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred'
    }

    db.bucket.replace.mockImplementationOnce((_id: any, _doc: any, _opts: any, cb: Function) => {
      cb(errorObj, null)
    })

    const repository = new UserRepository(db)

    return expect(repository.update(NewUserNoId as any, {})).rejects.toThrowError(ValidationError)
  })

  test('should fail if an error ocurred', () => {
    const db = testDatabase()

    const errorObj = 10

    db.bucket.replace.mockImplementationOnce((_id: any, _doc: any, _opts: any, cb: Function) => {
      cb(errorObj, null)
    })

    const repository: any = new UserRepository(db)
    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb('error')
      }
    }

    return expect(repository.update(validNewUser)).rejects.toThrowError(DatabaseError)
  })

  test('should fail if id does not exists in the database', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred'
    }

    db.bucket.replace.mockImplementationOnce((_id: any, _doc: any, _opts: any, cb: Function) => {
      cb(errorObj, null)
    })

    const repository: any = new UserRepository(db)
    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null)
      }
    }

    return expect(repository.update(validNewUser)).rejects.toThrowError(DatabaseError)
  })

  test('should fail if the document _type defined are not matched to the repository type', () => {
    const db = testDatabase()

    const repository: any = new UserRepository(db)
    const userToUpdate = {
      ...validNewUser,
      _type: 'Not User'
    }

    return expect(repository.update(userToUpdate)).rejects.toThrowError(ValidationError)
  })

  test('should update user successfully if the document _type is specified', async () => {
    const db = testDatabase()

    db.bucket.replace.mockImplementationOnce((_id: any, _doc: any, _opts: any, cb: Function) => {
      cb(null, null)
    })

    const repository: any = new UserRepository(db)
    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null)
      }
    }

    const userUpdatedData = {
      _type: 'User',
      _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
      name: 'Luis Suarez',
      email: 'lm10@manuscriptsapp.com',
      password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
      isVerified: true,
      creationTimestamp: 1518357671676
    }

    const user = await repository.update(userUpdatedData)

    expect(user).toMatchSnapshot()
  })

  test('should update user successfully', async () => {
    const db = testDatabase()

    db.bucket.replace.mockImplementationOnce((_id: any, _doc: any, _opts: any, cb: Function) => {
      cb(null, null)
    })

    const repository: any = new UserRepository(db)
    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null)
      }
    }

    const userUpdatedData = {
      _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
      name: 'Lionel Messi',
      email: 'lm10@manuscriptsapp.com',
      password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
      isVerified: true,
      creationTimestamp: 1518357671676
    }

    const user = await repository.update(userUpdatedData)

    expect(user).toMatchSnapshot()
  })

  test('should fail if database.documentMapper not set', () => {
    const db = testDatabase()
    const repository: any = new UserRepository(db)
    repository.database = {}
    const id = chance.hash()
    return expect(repository.update(id, { name: chance.name() })).rejects.toThrowError(NoDocumentMapperError)
  })
})

describe('CBRepository touch', () => {
  test('should fail if no bucket', async () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.touch(validUser1._id, 100)).rejects.toThrowError(NoBucketError)
  })

  test('should fail if id is not in the database', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred'
    }

    db.bucket.touch.mockImplementationOnce((_k: any, _ex: any, _opt: any, cb: Function) => {
      cb(errorObj, null)
    })

    const repository = new UserRepository(db)

    return expect(
      repository.touch(validNewUser._id, 100)
    ).rejects.toThrowError(DatabaseError)
  })

  test('should fail if an error ocurred', () => {
    const db = testDatabase()

    const errorObj = 10

    db.bucket.touch.mockImplementationOnce((_id: any, _ex: any, _opt: any, cb: Function) => {
      cb(errorObj, null)
    })

    const repository = new UserRepository(db)

    return expect(repository.touch(validUser1._id, 100)).rejects.toThrowError(DatabaseError)
  })

  test('should touch user successfully', async () => {
    const db = testDatabase()

    db.bucket.touch.mockImplementationOnce((_k: any, _ex: any, _opt: any, cb: Function) => {
      cb(null, { value: validUser1 })
    })

    const repository = new UserRepository(db)
    return expect(repository.touch(validUser1._id, 100)).resolves.toEqual(undefined)
  })
})

describe('CBRepository getById', () => {
  test('should fail if no bucket', () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.getById(validUser1._id)).rejects.toThrowError(NoBucketError)
  })

  test('should fail if error occurred', () => {
    const db = testDatabase()

    const errorObj = new Error('database derp')

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObj, null)
    })

    const repository = new UserRepository(db)

    return expect(
      repository.getById(validUser1._id)
    ).rejects.toThrowError(DatabaseError)
  })

  test('should return null if key does not exist', async () => {
    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(null, [])
    })

    const repository = new UserRepository(db)

    const user = await repository.getById(validUser1._id)
    expect(user).toBeNull()
  })

  test('should get user by id successfully', async () => {
    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(null, [{ 'BUCKET_NAME': validUser1 }])
    })

    const repository = new UserRepository(db)

    const user: any = await repository.getById(validUser1._id)

    expect(user._id).toBe(validUser1._id)
    expect(user.email).toBe(validUser1.email)
    expect(user.name).toBe(validUser1.name)
  })

  test('should fail if database.bucket not set', () => {
    const db = testDatabase()

    const repository: any = new UserRepository(db)
    repository.database = {}
    const id = chance.hash()

    return expect(repository.getById(id)).rejects.toThrowError(NoBucketError)
  })
})

describe('CBRepository getOne', () => {
  test('should fail if no bucket', () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.getOne({ email: validUser1.email })).rejects.toThrowError(NoBucketError)
  })

  test('should fail if error occurred', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred'
    }

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObj, null)
    })

    const repository = new UserRepository(db)

    return expect(
      repository.getOne({})
    ).rejects.toThrowError(DatabaseError)
  })

  test('should fail return null if no data exists', async () => {
    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(null, [])
    })

    const repository = new UserRepository(db)

    const user = await repository.getOne({})
    expect(user).toBeNull()
  })

  test('should return user', async () => {
    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(null, [{ 'BUCKET_NAME': validUser1 }])
    })

    const repository = new UserRepository(db)

    const user = await repository.getOne({})
    expect(user).toMatchSnapshot()
  })

  test('should fail if database.bucket not set', () => {
    const db = testDatabase()
    const repository: any = new UserRepository(db)
    repository.database = {}
    const id = (new Chance()).hash()

    return expect(repository.getOne({ id })).rejects.toThrowError(NoBucketError)
  })
})

describe('CBRepository count', () => {
  test('should fail if no bucket', () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.count({ email: validUser1.email })).rejects.toThrowError(NoBucketError)
  })

  test('should fail if error occurred', () => {
    const errorObj = {
      message: 'An error occurred'
    }

    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObj, null)
    })

    const repository = new UserRepository(db)

    return expect(
      repository.count({})
    ).rejects.toThrowError(DatabaseError)
  })

  test('should fail return count as number there is keys', async () => {
    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(null, [{ $1: 40 }])
    })

    const repository = new UserRepository(db)

    const count = await repository.count({})
    expect(count).toBe(40)
  })

  test('should fail if database.bucket not set', async () => {
    const db = testDatabase()
    const repository: any = new UserRepository(db)
    repository.database = {}
    const id = chance.hash()
    return expect(repository.count({ id })).rejects.toThrowError(NoBucketError)
  })
})

describe('CBRepository getAll', () => {
  test('should fail if no bucket', () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.getAll({}, null)).rejects.toThrowError(NoBucketError)
  })

  test('should fail if error occurred', () => {
    const errorObj = new Error('An error occurred')

    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObj, null)
    })

    const repository = new UserRepository(db)

    return expect(
      repository.getAll({}, null)
    ).rejects.toThrowError(DatabaseError)
  })

  test('should fail return empty set if no data exists', async () => {
    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(null, [])
    })

    const repository = new UserRepository(db)

    const user = await repository.getAll({}, null)
    expect(user).toEqual([])
  })

  test('should return user list', async () => {
    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(null, [{ 'BUCKET_NAME': validUser1 }])
    })

    const repository = new UserRepository(db)

    const user = await repository.getAll({}, null)
    expect(user).toMatchSnapshot()
  })
})

describe('CBRepository remove', () => {
  test('should fail if no bucket', () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.remove({})).rejects.toThrowError(NoBucketError)
  })

  test('should fail if error occurred', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred'
    }

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(errorObj, null)
    })

    const repository = new UserRepository(db)

    return expect(
      repository.remove({})
    ).rejects.toThrowError(DatabaseError)
  })

  test('should remove key', async () => {
    const db = testDatabase()

    db.bucket.query.mockImplementationOnce((_q: any, _p: any[], cb: Function) => {
      cb(null, [])
    })

    const repository = new UserRepository(db)

    await repository.remove({})
  })
})

describe('CBRepository pushDesignDocument', () => {
  test('should create new design document if it does not exists', async () => {
    const db = testDatabase()
    db.getDesignDocument = () => null
    const repository = new UserStatusRepository(db)

    await repository.pushDesignDocument()

    expect(db.createDesignDocument).toBeCalled()
  })

  test('should create new design document if databaseDesignDocument.viewsStatus does not exists', async () => {
    const db = testDatabase()
    db.getDesignDocument = () => {
      return {
      }
    }
    const repository = new UserStatusRepository(db)

    await repository.pushDesignDocument()

    expect(db.createDesignDocument).toBeCalled()
  })

  test('should create new design documents if checkSum is invalid', async () => {
    const db = testDatabase()
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

  test('should not create new design documents if checkSum match', async () => {
    const db = testDatabase()
    const repository: any = new UserStatusRepository(db)
    repository.buildDesignDocument = mockbuildDesignDocument
    db.getDesignDocument = () => {
      return {
        viewsStatus: {
          'failedLoginCount': '17a6b47113b80d6d8b775f33d9fc60ff2fc8a2e1'
        }
      }
    }

    await repository.pushDesignDocument()

    expect(db.createDesignDocument).not.toBeCalled()
  })
})

describe('CBRepository buildDesignDocument', () => {
  test('should return design document view with reduce function', async () => {
    const db = testDatabase()
    const repository: any = new UserStatusRepository(db)
    repository.buildViews = mockBuildViews

    const databaseView = await repository.buildDesignDocument()

    expect(databaseView.views.failedLoginCount.reduce).toBeDefined()
  })

  test('should return design document view without reduce function', async () => {
    const db = testDatabase()
    const repository: any = new UserStatusRepository(db)
    repository.buildViews = () => {
      const designDocument = mockBuildViews()
      const failedLoginCount = designDocument[0]
      failedLoginCount.reduce = null

      return [failedLoginCount]
    }

    const databaseView = await repository.buildDesignDocument()

    expect(databaseView.views.failedLoginCount.reduce).not.toBeDefined()
  })
})
