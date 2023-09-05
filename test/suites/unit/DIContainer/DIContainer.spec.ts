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

import { BucketKey } from '../../../../src/Config/ConfigurationTypes'
import { ProjectRepository } from '../../../../src/DataAccess/ProjectRepository/ProjectRepository'
import { SGRepository } from '../../../../src/DataAccess/SGRepository'
import { SQLRepository } from '../../../../src/DataAccess/SQLRepository'
import { UserRepository } from '../../../../src/DataAccess/UserRepository/UserRepository'

const { DIContainer } = require('../../../../src/DIContainer/DIContainer')

afterEach(() => {
  DIContainer._sharedContainer = null
})

describe('DIContainer', () => {
  test('accessing sharedContainer should fail if not initialized', () => {
    expect(() => DIContainer.sharedContainer).toThrow()
  })

  test('init cannot be called when there is a sharedContainer', () => {
    DIContainer._sharedContainer = { foo: 1 }
    return expect(DIContainer.init()).rejects.toThrow()
  })

  test('DIContainer static helper methods', () => {
    const db: any = { documentMapper: { model: () => ({}) } }
    const sgRepo = new ProjectRepository(BucketKey.Project, db)
    const cbRepo = new UserRepository(db)
    DIContainer._sharedContainer = {
      bucketForKey: (key: BucketKey) => ({ bucketName: key }),
    }

    expect(DIContainer.isSGRepositoryLike(sgRepo)).toBeTruthy()
    expect(DIContainer.isRepositoryLike(cbRepo)).toBeTruthy()
    expect(DIContainer.isRepositoryLike({ create: () => ({}) })).toBeFalsy()
  })

  test('DIContainer instance methods', () => {
    const db: any = { documentMapper: { model: () => ({}) } }
    const container = new DIContainer(db, db, false, null)
    DIContainer._sharedContainer = container
    expect(
      container.repositories.every(
        (x: any) => x instanceof SQLRepository || x instanceof SGRepository
      )
    ).toBeTruthy()
  })

  test('bucketForKey', () => {
    const userDB: any = {
      bucketKey: BucketKey.User,
      documentMapper: { model: () => ({}) },
    }
    const dataDB: any = {
      bucketKey: BucketKey.Project,
      documentMapper: { model: () => ({}) },
    }

    const container = new DIContainer(userDB, dataDB, false, null)
    expect(container.bucketForKey(BucketKey.User).bucketKey).toEqual(BucketKey.User)
    expect(container.bucketForKey(BucketKey.Project).bucketKey).toEqual(BucketKey.Project)
  })
})
