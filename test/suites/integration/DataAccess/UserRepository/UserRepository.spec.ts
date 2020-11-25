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

import { UserRepository } from '../../../../../src/DataAccess/UserRepository/UserRepository'
import { drop, seed, testDatabase, dropBucket } from '../../../../utilities/db'
import { INewUser } from '../../../../../src/Models/UserModels'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { DatabaseError } from '../../../../../src/Errors'
import { validUser1 } from '../../../../data/fixtures/UserRepository'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'

const chance = new Chance()
jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

describe('UserRepository getUsersToDelete', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true })
  })

  test('should get users - where deleteAt valued and passed', async () => {
    const repository = new UserRepository(db)

    expect(await repository.getUsersToDelete()).toBeNull()

    const newDocument: INewUser = {
      _id: 'user-id-test',
      email: chance.email(),
      name: chance.name()
    }

    const user = await repository.create(newDocument, {})

    await repository.patch(user._id, { deleteAt: 12345678 }, {})

    expect(await repository.getUsersToDelete()).toHaveLength(1)
  })
})

describe('UserRepository create', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ users: true })
  })

  test('should create new user', async () => {
    const repository = new UserRepository(db)
    const newDocument: INewUser = {
      _id: chance.hash(),
      email: chance.email(),
      name: chance.name()
    }

    const user = await repository.create(newDocument, {})

    expect(user._id).toBe(newDocument._id)
    expect(user.email).toBe(newDocument.email)
    expect(user.name).toBe(newDocument.name)
  })

  test('should fail if user id already exists', async () => {
    const repository = new UserRepository(db)
    const newUser: INewUser = {
      _id: validUser1.email,
      email: chance.email(),
      name: chance.name()
    }

    await expect(repository.create(newUser, {})).rejects.toThrowError(DatabaseError)
  })

  test('should fail name is empty', () => {
    const repository = new UserRepository(db)
    const newDocument: INewUser = {
      email: chance.email(),
      name: ''
    }
    return expect(repository.create(newDocument, {})).rejects.toThrowError(DatabaseError)
  })

  test('should fail name is more than 100 char', () => {
    const repository = new UserRepository(db)
    const newDocument: INewUser = {
      email: chance.email(),
      name: 'example long name '.repeat(6)
    }
    return expect(repository.create(newDocument, {})).rejects.toThrowError(DatabaseError)
  })

  test('should fail email is empty', () => {
    const repository = new UserRepository(db)
    const newDocument: INewUser = {
      email: '',
      name: chance.name()
    }
    return expect(repository.create(newDocument, {})).rejects.toThrowError(DatabaseError)
  })

  test('should fail email is invalid', () => {
    const repository = new UserRepository(db)
    const newDocument: INewUser = {
      email: `example-email@invalid-email`,
      name: chance.name()
    }
    return expect(repository.create(newDocument, {})).rejects.toThrowError(DatabaseError)
  })
})
