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

import { ProjectRepository } from '../../../../src/DataAccess/ProjectRepository/ProjectRepository'
import { BucketKey } from '../../../../src/Config/ConfigurationTypes'
import { UserRepository } from '../../../../src/DataAccess/UserRepository/UserRepository'
import { CBRepository } from '../../../../src/DataAccess/CBRepository'
import { SGRepository } from '../../../../src/DataAccess/SGRepository'
import { MemorizingRepository } from '../../../../src/DataAccess/MemorizingRepository/MemorizingRepository'

const { DIContainer } = require('../../../../src/DIContainer/DIContainer')

jest.mock('../../../../src/DataAccess/FunctionService', () => ({
  FunctionService: jest.fn(() => ({
    synchronize: () => Promise.resolve()
  })),
  // Below not strictly correct impl, but should do. Get the real func if this causes issues.
  applicationFromSource: (x: any) => x
}))

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
    const sgRepo = new ProjectRepository(BucketKey.Data, db)
    const cbRepo = new UserRepository(db)
    DIContainer._sharedContainer = {
      bucketForKey: (key: BucketKey) => ({ bucketName: key })
    }

    expect(DIContainer.isSGRepositoryLike(sgRepo)).toBeTruthy()
    expect(DIContainer.isRepositoryLike(cbRepo)).toBeTruthy()
    expect(DIContainer.isRepositoryLike({ create: () => ({}) })).toBeFalsy()

    expect(DIContainer.isDatabaseViewManager(sgRepo)).toBeFalsy()
    expect(
      DIContainer.isDatabaseViewManager({ pushDesignDocument: () => ({}) })
    ).toBeFalsy()
  })

  test('DIContainer instance methods', () => {
    const db: any = { documentMapper: { model: () => ({}) } }
    const container = new DIContainer(db, db, db, db, false, null)
    DIContainer._sharedContainer = container
    expect(
      container.databaseViewManagers.every(
        (x: any) =>
          x instanceof CBRepository || x instanceof MemorizingRepository
      )
    ).toBeTruthy()
    expect(
      container.repositories.every(
        (x: any) =>
          x instanceof CBRepository ||
          x instanceof SGRepository ||
          x instanceof MemorizingRepository
      )
    ).toBeTruthy()
  })

  test('bucketForKey', () => {
    const userDB: any = {
      bucketKey: BucketKey.User,
      documentMapper: { model: () => ({}) }
    }
    const dataDB: any = {
      bucketKey: BucketKey.Data,
      documentMapper: { model: () => ({}) }
    }
    const appStateDB: any = {
      bucketKey: BucketKey.AppState,
      documentMapper: { model: () => ({}) }
    }

    const container = new DIContainer(userDB, dataDB, appStateDB, false, null)
    expect(container.bucketForKey(BucketKey.User).bucketKey).toEqual(
      BucketKey.User
    )
    expect(container.bucketForKey(BucketKey.Data).bucketKey).toEqual(
      BucketKey.Data
    )
    expect(container.bucketForKey(BucketKey.AppState).bucketKey).toEqual(
      BucketKey.AppState
    )
  })

  test('createBucketAdministrators', () => {
    const db: any = { documentMapper: { model: () => ({}) } }
    const container = new DIContainer(db, db, db, false, null)
    const syncService = container.syncService
    syncService.createGatewayAdministrator = () => Promise.resolve()
    return expect(
      container.createBucketAdministrators()
    ).resolves.not.toThrow()
  })
})
