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

jest.mock('../../../../../../src/DataAccess/SQLRepository', () => ({
  SQLRepository: jest.fn(() => ({
    patch: jest.fn(),
    patchStatusWithUserId: jest.fn(),
  })),
}))

jest.mock(
  '../../../../../../src/DataAccess/ClientApplicationRepository/MemorizingClientApplicationRepository',
  () => ({
    MemorizingClientApplicationRepository: jest.fn(() => ({
      ensureApplicationsExist: jest.fn(),
    })),
  })
)

jest.mock('../../../../../../src/DIContainer/IAMTokenVerifier.ts', () => ({
  IAMTokenVerifier: jest.fn(() => ({
    setIssuer: jest.fn(),
  })),
}))

import '../../../../../utilities/dbMock'

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  SyncService,
} from '../../../../../../src/DomainServices/Sync/SyncService'
import * as syncAccessControl from '../../../../../../src/DataAccess/syncAccessControl'

import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('SyncService - isAlive', () => {
  test('should not throw if service is running', () => {
    return expect(SyncService.isAlive()).resolves.toBeTruthy()
  })
})

describe('SyncService - getOrCreateUserStatus', () => {
  const userToken = {
    _id: 'foo',
    userId: 'User|bar',
    hasExpiry: false,
    token: 'baz',
    deviceId: 'potato',
    appId: 'blah',
  }

  test('creates user status', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`

    syncService.userStatusRepository.getById = async (_id: string) => Promise.resolve(null)
    syncService.userStatusRepository.create = async (_doc: any) => Promise.resolve(userToken)

    const userStatus = await syncService.getOrCreateUserStatus(userToken.userId)
    expect(userStatus._id).toEqual('UserStatus|User|bar')
  })

  test('failing to create a user status should throw', () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`
    syncService.userStatusRepository.getById = async (_id: string) => {
      throw new Error()
    }
    return expect(
      syncService.getOrCreateUserStatus(userToken.userId)
    ).rejects.toThrowError(Error)
  })
})

describe('SyncService - createUserProfile', () => {
  test('creates a contributor', async () => {
    const user = {
      _id: 'User|foo',
      name: 'bar foo',
      email: 'foo@bar.com',
      isVerified: true,
    }
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userProfileRepository.database.bucket.insert = async (_id: string) => {
      Promise.resolve()
    }
    const mock = jest.spyOn(syncAccessControl, 'syncAccessControl');
    mock.mockResolvedValue()
    
    const contrib = await syncService.createUserProfile(user)

    expect(contrib._id).toContain('MPUserProfile:')
    expect(contrib.bibliographicName._id).toContain('MPBibliographicName:')
    expect(contrib.createdAt).toBeGreaterThan(1541070000)
    expect(contrib.createdAt).toEqual(contrib.updatedAt)
  })

  test('failing to create a contributor should throw', () => {
    const user = {
      _id: 'User|userId',
      name: 'bar',
      email: 'foo@bar.com',
      isVerified: true,
    }
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userProfileRepository.create = async (_id: string) => {
      throw new Error()
    }
    return expect(syncService.createUserProfile(user)).rejects.toThrowError(
      Error
    )
  })
})

describe('SyncService - removeUserStatus', () => {
  const userToken = {
    _id: 'foo',
    userId: 'User|bar',
    hasExpiry: false,
    token: 'baz',
    deviceId: 'potato',
    appId: 'blah',
  }

  test('remove user status', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`
    syncService.userStatusRepository.remove = (_id: string) => Promise.resolve()
    syncService.userStatusRepository.getById = async (_id: string) => Promise.resolve({})

    await syncService.removeUserStatus(userToken.userId)
  })

  test('failing to remove a user status should throw', () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.remove = async (_id: string) => {
      throw new Error()
    }
    return expect(syncService.removeUserStatus(userToken.userId)).rejects.toThrowError(Error)
  })
})
