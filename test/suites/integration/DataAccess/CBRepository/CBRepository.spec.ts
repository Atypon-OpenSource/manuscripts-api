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
import { N1qlQuery } from 'couchbase'

import { UserRepository } from '../../../../../src/DataAccess/UserRepository/UserRepository'
import { UserTokenRepository } from '../../../../../src/DataAccess/UserTokenRepository/UserTokenRepository'
import { UserEventRepository } from '../../../../../src/DataAccess/UserEventRepository/UserEventRepository'
import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import { validUser1, validUser2, validNewUser, NewUserNoId, validNewUser2 } from '../../../../data/fixtures/UserRepository'
import { NoDocumentMapperError, ValidationError, DatabaseError, NoBucketError, RecordNotFoundError, SecondaryIndexMissingError } from '../../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { log } from '../../../../../src/Utilities/Logger'
import { ensureTypeBound } from '../../../../../src/DataAccess/Interfaces/IndexedRepository'
import { setTimeout } from 'timers'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

const chance = new Chance()
describe('CBRepository', () => {
  test('documentType should match expectation', () => {
    log.info('Testing documentType…')
    const repository = new UserRepository(db)
    expect(repository.documentType).toBe('User')
  })

  test('should throw error if N1QL doesn\'t contain _type as part of the where clause', () => {
    expect(() => ensureTypeBound(N1qlQuery.fromString('SELECT * FROM BUCKET WHERE age = 30'))).toThrowError(ValidationError)
  })

  test('should not throw if querying by primary key', () => {
    const repository2 = new UserEventRepository(db)
    expect(() => repository2.whereClause({ _id: validUser1._id })).toBeDefined()
  })

  test('should throw if querying by an un-indexed key due to the key being missing', () => {
    const repository = new UserTokenRepository(db)
    expect(() => { repository.whereClause({ derpderp: null }) }).toThrowError(SecondaryIndexMissingError)
  })

  test('should throw if querying by an un-indexed key due to buildModelOptions() returning no index', () => {
    const repository = new UserTokenRepository(db)
    const func = repository.buildModelOptions
    repository.buildModelOptions = (() => {
      const opts = func()
      delete opts.index
      return opts
    }).bind(repository)
    expect(() => { repository.whereClause({ derpderp: null }) }).toThrowError(SecondaryIndexMissingError)
  })
})

describe('CBRepository Consistency', () => {
  // TODO: test NOT_BOUND after fixing typing issue
  test('should be REQUEST_PLUS', () => {
    const repository = new UserRepository(db, N1qlQuery.Consistency.REQUEST_PLUS)
    expect(repository.consistency).toBe(N1qlQuery.Consistency.REQUEST_PLUS)
  })

  test('should be STATEMENT_PLUS', () => {
    const repository = new UserRepository(db, N1qlQuery.Consistency.STATEMENT_PLUS)
    expect(repository.consistency).toBe(N1qlQuery.Consistency.STATEMENT_PLUS)
  })
})

describe('CBRepository Create', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true })
  })

  test('should create user successfully', async () => {
    const repository = new UserRepository(db)
    const user = await repository.create(validNewUser, {})

    expect(user).toEqual(user)
  })

  test('should fail if database.documentMapper not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}
    return expect(repository.create(validUser1)).rejects.toThrowError(NoDocumentMapperError)
  })

  test('should fail if error occurred - same key exists', () => {
    const chance = new Chance()
    const repository = new UserRepository(db)
    const newUser = {
      _id: 'valid-user@manuscriptsapp.com',
      email: chance.email(),
      name: chance.name()
    }
    return expect(repository.create(newUser, {})).rejects.toThrowError(DatabaseError)
  })

  test('should delete the created user after the expiry time pass', async () => {
    const repository = new UserRepository(db)
    const user: any = await repository.create(validNewUser2, { expiry: 1 })

    expect(user).toEqual({
      _id: validNewUser2._id,
      email: validNewUser2.email,
      name: validNewUser2.name
    })

    await new Promise(
      (resolve, reject) => setTimeout(() => {
        repository.getById(validNewUser2._id)
        .then(result => {
          expect(result).toBeNull()
          resolve()
        })
        .catch(error => reject(error))
      }, 2000)
    )
  })
})

describe('CBRepository update', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true })
  })

  test('should fail if database.documentMapper not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}

    return expect(repository.update(validUser1)).rejects.toThrowError(NoDocumentMapperError)
  })

  test('should fail if the id is not specified', () => {
    const repository = new UserRepository(db)
    return expect(repository.update(NewUserNoId as any, {})).rejects.toThrowError(ValidationError)
  })

  test('should fail if id does not exists in the database', () => {
    const repository = new UserRepository(db)

    return expect(repository.update(validNewUser, {})).rejects.toThrowError(DatabaseError)
  })

  test('should fail if email is in a wrong format', () => {
    const repository = new UserRepository(db)
    const userUpdatedData = {
      _id: validUser1._id,
      name: 'New Username',
      email: 'new-email'
    }

    return expect(repository.update(userUpdatedData, {})).rejects.toThrowError(DatabaseError)
  })

  test('should fail if name is in longer than 100 character', () => {
    const repository = new UserRepository(db)
    const userUpdatedData = {
      _id: validUser1.email,
      name: 'New Username that is too looooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong, more than 100 character, ',
      email: 'new-email@manuscriptsapp.com'
    }

    return expect(repository.update(userUpdatedData, {})).rejects.toThrowError(DatabaseError)
  })

  test('should fail if the document _type defined are not matched to the repository type', () => {
    const repository = new UserRepository(db)
    const userUpdatedData = {
      _type: 'Not User',
      _id: validUser1._id,
      name: 'New Username',
      email: 'new-email@manuscriptsapp.com'
    }

    return expect(repository.update(userUpdatedData, {})).rejects.toThrowError(ValidationError)
  })

  test('should update user successfully if the document _type is defined', async () => {
    const repository = new UserRepository(db)
    const beforeUpdate: any = await repository.getById(validUser1._id)

    expect(beforeUpdate.email).toBe(validUser1.email)
    expect(beforeUpdate.name).toBe(validUser1.name)

    const userUpdatedData = {
      _type: 'User',
      _id: 'User|valid-user@manuscriptsapp.com',
      name: 'New Username',
      email: 'new-email@manuscriptsapp.com'
    }

    const afterUpdate: any = await repository.update(userUpdatedData, {})

    expect(afterUpdate.email).toBe('new-email@manuscriptsapp.com')
    expect(afterUpdate.name).toBe('New Username')
  })

  test('should update user successfully if the document _type is undefined', async () => {
    const repository = new UserRepository(db)
    const beforeUpdate: any = await repository.getById(validUser1._id)

    expect(beforeUpdate.email).toBe(validUser1.email)
    expect(beforeUpdate.name).toBe(validUser1.name)

    const userUpdatedData = {
      _id: 'User|valid-user@manuscriptsapp.com',
      name: 'New Username',
      email: 'new-email@manuscriptsapp.com'
    }

    const afterUpdate: any = await repository.update(userUpdatedData, {})

    expect(afterUpdate.email).toBe('new-email@manuscriptsapp.com')
    expect(afterUpdate.name).toBe('New Username')
  })

  test('should delete the updated user after the expiry time pass', async () => {
    const repository = new UserRepository(db)

    const userUpdatedData = {
      _id: 'User|valid-user-2@manuscriptsapp.com',
      name: 'New Username',
      email: 'new-email@manuscriptsapp.com'
    }

    const user = await repository.update(userUpdatedData, { expiry: 1 })
    expect(user).toEqual({
      _id: userUpdatedData._id,
      email: userUpdatedData.email,
      name: userUpdatedData.name
    })

    await new Promise((resolve, reject) => {
      setTimeout(() => {
        repository.getById(userUpdatedData._id)
        .then(result => {
          expect(result).toBeNull()
          resolve()
        })
        .catch(error => reject(error))
      }, 2000)
    })
  })
})

describe('CBRepository patch', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true })
  })

  test('should fail if database.documentMapper not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}
    const id = chance.hash()

    return expect(repository.patch(id, { name: chance.name() })).rejects.toThrowError(NoDocumentMapperError)
  })

  test('should fail if document _id does not match the id', () => {
    const repository = new UserRepository(db)
    const chance = new Chance()
    const id = chance.hash()
    return expect(repository.patch(id, { _id: chance.string(), name: chance.name() }, {})).rejects.toThrowError(ValidationError)
  })

  test('should fail if key does not exist', () => {
    const repository = new UserRepository(db)
    const chance = new Chance()
    const id = chance.hash()
    return expect(repository.patch(id, { name: chance.name() }, {})).rejects.toThrowError(RecordNotFoundError)
  })

  test('should fail if error occurred', () => {
    const repository = new UserRepository(db)
    const document = {
      name: 'long name used in test to generates error if name length is more than 100 char -  we need to fine new way to throw error from db internally- this just a tmp solution'
    }

    return expect(repository.patch(validUser2._id, document, {})).rejects.toThrowError(DatabaseError)
  })

  test('should patch user data successfully', async () => {
    const repository = new UserRepository(db)

    let user: any = await repository.patch('User|valid-user@manuscriptsapp.com', {
      name: 'Cody Rodriquez'
    }, {})
    user = await repository.getById('User|valid-user@manuscriptsapp.com')

    expect(user.name).toBe('Cody Rodriquez')
  })

  test('should delete the patched user after the expiry time pass', async () => {
    const repository = new UserRepository(db)

    const userUpdatedData = {
      _id: 'User|valid-user-2@manuscriptsapp.com',
      email: 'new-email@manuscriptsapp.com'
    }

    const user = await repository.patch(userUpdatedData._id, { email: userUpdatedData.email }, { expiry: 1 })
    expect(user.email).toEqual(userUpdatedData.email)
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        repository.getById(userUpdatedData._id)
        .then(result => {
          expect(result).toBeNull()
          resolve()
        })
        .catch(error => reject(error))
      }, 2000)
    })
  })
})

describe('CBRepository touch', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true })
  })

  test('should fail if database.documentMapper not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}
    const id = chance.hash()
    return expect(repository.touch(id, 100)).rejects.toThrowError(NoBucketError)
  })

  test('should fail if error occurred - key does not exist', () => {
    const repository = new UserRepository(db)
    const chance = new Chance()
    const id = chance.hash()
    return expect(repository.touch(id, 100)).rejects.toThrowError(DatabaseError)
  })

  test('should touch user successfully', async () => {
    const repository = new UserRepository(db)
    await repository.touch(validUser2._id, 100)
  })
})

describe('CBRepository getById', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true })
  })

  test('should fail if database.bucket not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}
    const id = chance.hash()
    return expect(repository.getById(id)).rejects.toThrowError(NoBucketError)
  })

  test('should fail return null if key not exists', async () => {
    const repository = new UserRepository(db)
    const chance = new Chance()
    const id = chance.hash()
    const user = await repository.getById(id)

    expect(user).toBeNull()
  })

  test('should get user by id successfully', async () => {
    const repository = new UserRepository(db)
    const user: any = await repository.getById('User|valid-user@manuscriptsapp.com')

    expect(user._id).toBe('User|valid-user@manuscriptsapp.com')
    expect(user.email).toBe('valid-user@manuscriptsapp.com')
    expect(user.name).toBe('Valid System User')
  })
})

describe('CBRepository getOne', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true })
  })

  test('should fail if database.bucket not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}
    const _id = chance.hash()
    return expect(repository.getOne({ _id })).rejects.toThrowError(NoBucketError)
  })

  test('should return undefined if no data exists', async () => {
    const repository = new UserRepository(db)
    const chance = new Chance()
    const user = await repository.getOne({ _id: chance.hash() })

    expect(user).toBeNull()
  })

  test('should return user', async () => {
    const repository = new UserRepository(db)

    const user = await repository.getOne({ _id: validUser2._id })
    expect(user).toMatchSnapshot()
  })
})

describe('CBRepository count', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true })
  })

  test('should fail return count as number there is keys', async () => {
    const repository = new UserRepository(db)

    const count = await repository.count({ _id: validUser2._id })
    expect(count).toBe(1)
  })

  test('should fail if database.bucket not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}
    const _id = chance.hash()
    return expect(repository.count({ _id })).rejects.toThrowError(NoBucketError)
  })
})

describe('CBRepository getAll', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true })
  })

  test('should return empty set if no data exists', () => {
    const repository = new UserRepository(db)
    const chance = new Chance()
    const query = {
      email: chance.email(),
      name: chance.email(),
      _id: chance.hash()
    }
    return expect(repository.getAll(query, null)).resolves.toEqual([])
  })

  test('should return user list', () => {
    const repository = new UserRepository(db)
    return expect(repository.getAll({ _id: validUser2._id }, null)).resolves.toMatchSnapshot()
  })

  test('should fail if database.bucket not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}
    return expect(repository.getAll({ _id: validUser2._id }, null)).rejects.toThrowError(NoBucketError)
  })
})

describe('CBRepository remove', () => {
  test('should remove key', async () => {
    const repository = new UserRepository(db)
    const query = {
      _id: validUser2._id
    }
    await repository.remove(query)
    const user = await repository.getOne(query)
    expect(user).toBeNull()
  })

  test('should fail if database.bucket not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}
    const query = { _id: validUser2._id }
    return expect(repository.remove(query)).rejects.toThrowError(NoBucketError)
  })
})

describe('CBRepository whereClause', () => {
  test('should remove key', () => {
    const repository = new UserRepository(db)
    const query = repository.whereClause(null)

    expect(query.N1QL).toBe('_type = $1')
    expect(query.params).toEqual([repository.documentType])
  })
})

describe('CBRepository buildModel', () => {
  test('should remove any property equal to undefined', () => {
    const repository = new UserRepository(db)
    const mappedModel = repository.buildModel({
      email: undefined,
      name: 'foo'
    } as any)

    expect(mappedModel.email).toBeUndefined()
    expect(mappedModel.name).toBeDefined()
  })

  test('should fail if database.bucket not set', () => {
    const repository: any = new UserRepository(db)
    repository.database = {}
    const query = { _id: validUser2._id }
    return expect(repository.remove(query)).rejects.toThrowError(NoBucketError)
  })
})
