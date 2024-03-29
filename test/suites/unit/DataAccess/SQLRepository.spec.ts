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

import { config } from '../../../../src/Config/Config'
import { BucketKey } from '../../../../src/Config/ConfigurationTypes'
import { SQLDatabase } from '../../../../src/DataAccess/SQLDatabase'
import { UserRepository } from '../../../../src/DataAccess/UserRepository/UserRepository'
import { DatabaseError, NoBucketError, ValidationError } from '../../../../src/Errors'
import { NewUserNoId, validNewUser, validUser1 } from '../../../data/fixtures/UserRepository'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

function testDatabase(): any {
  return new SQLDatabase(config.DB, BucketKey.User)
}

const chance = new Chance()
describe('SQLRepository', () => {
  test('documentType', () => {
    const repository = new UserRepository(testDatabase())
    expect(repository.documentType).toBe('User')
  })
})

describe('SQLRepository Create', () => {
  test('should fail if error occurred', () => {
    const db = testDatabase()

    const errorObj = new Error('database derp')
    const repository: any = new UserRepository(db)

    db.bucket.insert.mockImplementationOnce((_document: any) => Promise.reject(errorObj))

    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)

    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    const chance = new Chance()

    return expect(
      repository.create({
        email: chance.email(),
        name: chance.name(),
      })
    ).rejects.toThrow(DatabaseError)
  })

  test('should create user successfully', async () => {
    const db = testDatabase()

    const repository: any = new UserRepository(db)

    db.bucket.insert.mockImplementationOnce((_document: any) => Promise.resolve())

    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)

    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    const user = await repository.create({
      _id: 'valid-user2@manuscriptsapp.com',
      email: 'valid-user2@manuscriptsapp.com',
      name: 'Valid System User',
    })

    expect(user).toMatchSnapshot()
  })
})

describe('SQLRepository patch', () => {
  test('should fail key not exists', () => {
    const db = testDatabase()
    const chance = new Chance()

    const errorObj = {
      message: 'An error occurred',
    }

    db.bucket.replace.mockImplementationOnce((_key: any, _document: any) =>
      Promise.reject(errorObj)
    )

    const repository: any = new UserRepository(db)

    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    return expect(
      repository.patch(validUser1._id, {
        name: chance.name(),
      })
    ).rejects.toThrow(DatabaseError)
  })

  test('should fail if document _id is different than the passed id', () => {
    const db = testDatabase()
    const repository = new UserRepository(db)
    const chance = new Chance()

    return expect(
      repository.patch(validUser1._id, {
        _id: chance.string(),
        name: chance.name(),
      })
    ).rejects.toThrow(ValidationError)
  })

  test('should fail if error occurred', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred',
    }

    db.bucket.query.mockImplementationOnce((_statement: any) =>
      Promise.resolve([{ [db.bucket._name]: validUser1 }])
    )

    db.bucket.replace.mockImplementationOnce((_key: any, _document: any) =>
      Promise.reject(errorObj)
    )

    const repository: any = new UserRepository(db)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    return expect(
      repository.patch(validUser1._id, {
        name: 'Cody Rodriquez',
      })
    ).rejects.toThrow(DatabaseError)
  })

  test('should patch user data successfully', () => {
    const db = testDatabase()

    const validUser = { data: Object.assign(validUser1, { name: 'Cody Rodriquez' }) }

    db.bucket.replace.mockImplementationOnce((_key: any, _document: any) =>
      Promise.resolve(validUser)
    )

    db.bucket.upsert.mockImplementationOnce((_key: any, _document: any) => Promise.resolve())

    const repository: any = new UserRepository(db)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    return expect(
      repository.patch(validUser1._id, { name: 'Cody Rodriquez' })
    ).resolves.toMatchSnapshot()
  })
})

describe('SQLRepository update', () => {
  test('should fail if id is not specified', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred',
    }

    db.bucket.replace.mockImplementationOnce((_id: any, _doc: any, _opts: any, cb: Function) => {
      cb(errorObj, null)
    })

    const repository = new UserRepository(db)

    return expect(repository.update(NewUserNoId as any)).rejects.toThrow(ValidationError)
  })

  test('should fail if an error ocurred', () => {
    const db = testDatabase()

    const errorObj = 10

    db.bucket.replace.mockImplementationOnce((_id: any, _document: any) => Promise.reject(errorObj))

    const repository: any = new UserRepository(db)
    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb('error'),
      },
    }

    return expect(repository.update(validNewUser)).rejects.toThrow(DatabaseError)
  })

  test('should fail if id does not exists in the database', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred',
    }

    db.bucket.replace.mockImplementationOnce((_id: any, _document: any) => Promise.reject(errorObj))

    const repository: any = new UserRepository(db)
    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    return expect(repository.update(validNewUser)).rejects.toThrow(DatabaseError)
  })

  test('should fail if the document _type defined are not matched to the repository type', () => {
    const db = testDatabase()

    const repository: any = new UserRepository(db)
    const userToUpdate = {
      ...validNewUser,
      _type: 'Not User',
    }

    return expect(repository.update(userToUpdate)).rejects.toThrow(ValidationError)
  })

  test('should update user successfully if the document _type is specified', async () => {
    const db = testDatabase()

    const repository: any = new UserRepository(db)
    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    const userUpdatedData = {
      _type: 'User',
      _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
      name: 'Luis Suarez',
      email: 'lm10@manuscriptsapp.com',
      password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
      isVerified: true,
      creationTimestamp: 1518357671676,
    }

    db.bucket.replace.mockImplementationOnce((_id: any, _document: any) =>
      Promise.resolve({ data: userUpdatedData })
    )

    const user = await repository.update(userUpdatedData)

    expect(user).toMatchSnapshot()
  })

  test('should update user successfully', async () => {
    const db = testDatabase()

    const repository: any = new UserRepository(db)
    db.documentMapper.models.User.fromData.mockImplementationOnce((_a: any) => validNewUser)
    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    const userUpdatedData = {
      _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
      name: 'Lionel Messi',
      email: 'lm10@manuscriptsapp.com',
      password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
      isVerified: true,
      creationTimestamp: 1518357671676,
    }

    db.bucket.replace.mockImplementationOnce((_id: any, _document: any) =>
      Promise.resolve({ data: userUpdatedData })
    )

    const user = await repository.update(userUpdatedData)

    expect(user).toMatchSnapshot()
  })
})

describe('SQLRepository touch', () => {
  test('should fail if no bucket', async () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.touch(validUser1._id, 100)).rejects.toThrow(NoBucketError)
  })

  test('should fail if id is not in the database', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred',
    }

    db.bucket.replace.mockImplementationOnce((_k: any, _ex: any, _opt: any) =>
      Promise.reject(errorObj)
    )

    const repository: any = new UserRepository(db)

    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    return expect(repository.touch(validNewUser._id, 100)).rejects.toThrow(DatabaseError)
  })

  test('should fail if an error ocurred', () => {
    const db = testDatabase()

    const errorObj = 10

    db.bucket.replace.mockImplementationOnce((_k: any, _ex: any, _opt: any) =>
      Promise.reject(errorObj)
    )

    const repository: any = new UserRepository(db)

    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    return expect(repository.touch(validUser1._id, 100)).rejects.toThrow(DatabaseError)
  })

  test('should touch user successfully', async () => {
    const db = testDatabase()

    db.bucket.replace.mockImplementationOnce((_k: any, _ex: any, _opt: any) =>
      Promise.resolve({ data: {} })
    )

    const repository: any = new UserRepository(db)

    repository.modelConstructor = {
      schema: {
        validate: (_a: any, cb: Function) => cb(null),
      },
    }

    return expect(repository.touch(validUser1._id, 100)).resolves.toEqual(undefined)
  })
})

describe('SQLRepository getById', () => {
  test('should fail if no bucket', () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.getById(validUser1._id)).rejects.toThrow(NoBucketError)
  })

  test('should fail if error occurred', () => {
    const db = testDatabase()

    const errorObj = new Error('database derp')

    db.bucket.findUnique.mockImplementationOnce((_q: any, _p: any[]) => Promise.reject(errorObj))

    const repository = new UserRepository(db)

    return expect(repository.getById(validUser1._id)).rejects.toThrow(DatabaseError)
  })

  test('should return null if key does not exist', async () => {
    const db = testDatabase()

    db.bucket.findUnique.mockImplementationOnce((_q: any, _p: any[]) => Promise.resolve(null))

    const repository = new UserRepository(db)

    const user = await repository.getById(validUser1._id)
    expect(user).toBeNull()
  })

  test('should get user by id successfully', async () => {
    const db = testDatabase()

    db.bucket.findUnique.mockImplementationOnce((_q: any, _p: any[]) =>
      Promise.resolve({ data: validUser1 })
    )

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

    return expect(repository.getById(id)).rejects.toThrow(NoBucketError)
  })
})

describe('SQLRepository getOne', () => {
  test('should fail if no bucket', () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.getOne({ email: validUser1.email })).rejects.toThrow(NoBucketError)
  })

  test('should fail if error occurred', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred',
    }

    db.bucket.findFirst.mockImplementationOnce((_q: any, _p: any[]) => Promise.reject(errorObj))

    const repository = new UserRepository(db)

    return expect(repository.getOne({})).rejects.toThrow(DatabaseError)
  })

  test('should fail return null if no data exists', async () => {
    const db = testDatabase()

    db.bucket.findFirst.mockImplementationOnce((_q: any, _p: any[]) => Promise.resolve(null))

    const repository = new UserRepository(db)

    const user = await repository.getOne({})
    expect(user).toBeNull()
  })

  test('should return user', async () => {
    const db = testDatabase()

    const validUser = { data: Object.assign(validUser1, { name: 'Cody Rodriquez' }) }

    db.bucket.findFirst.mockImplementationOnce((_q: any, _p: any[]) => Promise.resolve(validUser))

    const repository = new UserRepository(db)

    const user = await repository.getOne({})
    expect(user).toMatchSnapshot()
  })

  test('should fail if database.bucket not set', () => {
    const db = testDatabase()
    const repository: any = new UserRepository(db)
    repository.database = {}
    const id = new Chance().hash()

    return expect(repository.getOne({ id })).rejects.toThrow(NoBucketError)
  })
})

describe('SQLRepository count', () => {
  test('should fail if no bucket', () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.count({ email: validUser1.email })).rejects.toThrow(NoBucketError)
  })

  test('should fail if error occurred', () => {
    const errorObj = {
      message: 'An error occurred',
    }

    const db = testDatabase()

    db.bucket.count.mockImplementationOnce((_q: any, _p: any[]) => Promise.reject(errorObj))

    const repository = new UserRepository(db)

    return expect(repository.count({})).rejects.toThrow(DatabaseError)
  })

  test('should fail return count as number there is keys', async () => {
    const db = testDatabase()

    db.bucket.count.mockImplementationOnce((_q: any, _p: any[]) => Promise.resolve(40))

    const repository = new UserRepository(db)

    const count = await repository.count({})
    expect(count).toBe(40)
  })

  test('should fail if database.bucket not set', async () => {
    const db = testDatabase()
    const repository: any = new UserRepository(db)
    repository.database = {}
    const id = chance.hash()
    return expect(repository.count({ id })).rejects.toThrow(NoBucketError)
  })
})

describe('SQLRepository getAll', () => {
  test('should fail if no bucket', () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.getAll({}, null)).rejects.toThrow(NoBucketError)
  })

  test('should fail if error occurred', () => {
    const errorObj = new Error('An error occurred')

    const db = testDatabase()

    db.bucket.findMany.mockImplementationOnce((_q: any, _p: any[]) => Promise.reject(errorObj))

    const repository = new UserRepository(db)

    return expect(repository.getAll({}, null)).rejects.toThrow(DatabaseError)
  })

  test('should fail return empty set if no data exists', async () => {
    const db = testDatabase()

    db.bucket.findMany.mockImplementationOnce((_q: any, _p: any[]) => Promise.resolve([]))

    const repository = new UserRepository(db)

    const user = await repository.getAll({}, null)
    expect(user).toEqual([])
  })

  test('should return user list', async () => {
    const db = testDatabase()

    const validUser = { data: Object.assign(validUser1, { name: 'Cody Rodriquez' }) }

    db.bucket.findMany.mockImplementationOnce((_q: any, _p: any[]) => Promise.resolve([validUser]))

    const repository = new UserRepository(db)

    const user = await repository.getAll({}, null)
    expect(user).toMatchSnapshot()
  })
})

describe('SQLRepository remove', () => {
  test('should fail if no bucket', () => {
    const db = testDatabase()
    db.bucket = null
    const repository = new UserRepository(db)
    return expect(repository.remove({})).rejects.toThrow(NoBucketError)
  })

  test('should fail if error occurred', () => {
    const db = testDatabase()

    const errorObj = {
      message: 'An error occurred',
    }

    db.bucket.remove.mockImplementationOnce((_q: any, _p: any[]) => Promise.reject(errorObj))

    const repository = new UserRepository(db)

    return expect(repository.remove({})).rejects.toThrow(DatabaseError)
  })

  test('should remove key', async () => {
    const db = testDatabase()

    db.bucket.remove.mockImplementationOnce((_q: any, _p: any[]) => Promise.resolve([]))

    const repository = new UserRepository(db)

    await repository.remove({})
  })
})
