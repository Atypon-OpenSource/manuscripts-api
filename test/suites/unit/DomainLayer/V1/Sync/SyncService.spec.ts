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

import { config } from '../../../../../../src/Config/Config'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ValidationError, SyncError, GatewayInaccessibleError } from '../../../../../../src/Errors'
import {
  SYNC_GATEWAY_PASSWORD_BYTE_COUNT,
  SyncService,
} from '../../../../../../src/DomainServices/Sync/SyncService'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('SyncService - isAlive', () => {
  test('should not throw if sync_gateway is running', () => {
    return expect(SyncService.isAlive()).resolves.toBeTruthy()
  })
})

describe('SyncService - createGatewayAccount', () => {
  const userToken = {
    _id: 'foo',
    userId: 'User|bar',
    hasExpiry: false,
    token: 'baz',
    deviceId: 'potato',
    appId: 'blah',
  }

  test('creates sync_gateway user', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`

    syncService.userStatusRepository.getById = async (_id: string) => Promise.resolve(null)
    syncService.userStatusRepository.create = async (_doc: any) => Promise.resolve(userToken)

    const userId = await syncService.createGatewayAccount(userToken.userId, BucketKey.Data)
    expect(userId).toEqual('UserStatus|User|bar')
  })

  test('gatewayAccountExists should resolve to true', () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`
    syncService.userStatusRepository.getById = async (_id: string) => Promise.resolve(true)
    return expect(
      syncService.gatewayAccountExists(userToken.userId, BucketKey.DerivedData)
    ).resolves.toEqual(true)
  })

  test('creating a sync_gateway user should resolve to false', () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`
    syncService.userStatusRepository.getById = async (_id: string) => Promise.resolve(false)
    return expect(
      syncService.gatewayAccountExists(userToken.userId, BucketKey.DerivedData)
    ).resolves.toEqual(false)
  })

  test('failing to create a sync_gateway user should reject', () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`
    syncService.userStatusRepository.getById = async (_id: string) => {
      throw new Error()
    }
    return expect(
      syncService.gatewayAccountExists(userToken.userId, BucketKey.DerivedData)
    ).rejects.toThrowError()
  })

  test('failing to create a sync_gateway user should throw', () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`
    syncService.userStatusRepository.getById = async (_id: string) => {
      throw new Error()
    }
    return expect(
      syncService.createGatewayAccount(userToken.userId, BucketKey.Data)
    ).rejects.toThrowError(Error)
  })
})

describe('SyncService - createGatewayContributor', () => {
  test('creates a contributor', async () => {
    const user = {
      _id: 'User|foo',
      name: 'bar foo',
      email: 'foo@bar.com',
      isVerified: true,
    }
    const syncService = DIContainer.sharedContainer.syncService
    const contrib = await syncService.createGatewayContributor(user, BucketKey.Data)

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
    return expect(syncService.createGatewayContributor(user, BucketKey.Data)).rejects.toThrowError(
      Error
    )
  })
})

describe('SyncService - removeGatewayAccount', () => {
  const userToken = {
    _id: 'foo',
    userId: 'User|bar',
    hasExpiry: false,
    token: 'baz',
    deviceId: 'potato',
    appId: 'blah',
  }

  test('remove sync_gateway user', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`
    syncService.userStatusRepository.remove = (_id: string) => Promise.resolve()
    syncService.userStatusRepository.getById = async (_id: string) => Promise.resolve({})

    await syncService.removeGatewayAccount(userToken.userId)

    syncService.userStatusRepository.getById = async (_id: string) => Promise.resolve(null)
    const exists = await syncService.gatewayAccountExists(userToken.userId)

    expect(exists).toEqual(false)
  })

  test('failing to remove a sync_gateway user should throw', () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.remove = async (_id: string) => {
      throw new Error()
    }
    return expect(syncService.removeGatewayAccount(userToken.userId)).rejects.toThrowError(Error)
  })
})
