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
    patchStatusWithUserId: jest.fn()
  }))
}))

jest.mock('../../../../../../src/DataAccess/ClientApplicationRepository/MemorizingClientApplicationRepository', () => ({
  MemorizingClientApplicationRepository: jest.fn(() => ({
    ensureApplicationsExist: jest.fn()
  }))
}))

jest.mock('../../../../../../src/DIContainer/IAMTokenVerifier.ts', () => ({
  IAMTokenVerifier: jest.fn(() => ({
    setIssuer: jest.fn()
  }))
}))

import '../../../../../utilities/dbMock'

jest.mock('request-promise-native')

const request = require('request-promise-native')

import { config } from '../../../../../../src/Config/Config'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ValidationError, SyncError, GatewayInaccessibleError } from '../../../../../../src/Errors'
import { SYNC_GATEWAY_PASSWORD_BYTE_COUNT, SyncService } from '../../../../../../src/DomainServices/Sync/SyncService'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

xdescribe('SyncService - isAlive', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200 }))
  })

  test('should not throw if sync_gateway is running', () => {
    return expect(SyncService.isAlive()).resolves.toBeTruthy()
  })
})

xdescribe('SyncService - createGatewayAccount', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200 }))
  })

  const userToken = {
    _id: 'foo',
    userId: 'User|bar',
    hasExpiry: false,
    token: 'baz',
    deviceId: 'potato',
    appId: 'blah'
  }

  test('creates sync_gateway user', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`

    await syncService.createGatewayAccount(userToken.userId, BucketKey.Data)
    const payload = request.mock.calls[0][0]

    const password = payload.body.password

    // Multiply by two because hex string
    expect(password.length).toEqual(SYNC_GATEWAY_PASSWORD_BYTE_COUNT * 2)

    expect(payload).toEqual({
      json: true,
      method: 'PUT',
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${config.gateway.ports.admin}/bkt/_user/User_bar`,
      body: {
        password,
        admin_channels: [
          'User_bar',
          'User_bar-readwrite'
        ],
        admin_roles: []
      }
    })
  })

  test('gatewayAccountExists should resolve to true when 200 is returned', () => {
    request.mockImplementation(() => Promise.resolve({ statusCode: 200 }))
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.gatewayAccountExists(userToken.userId, BucketKey.DerivedData))
      .resolves.toEqual(true)
  })

  test('creating a sync_gateway user should resolve to false when 404 is returned', () => {
    request.mockImplementation(() => Promise.resolve({ statusCode: 404 }))
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.gatewayAccountExists(userToken.userId, BucketKey.DerivedData))
      .resolves.toEqual(false)
  })

  test('failing to create a sync_gateway user should reject', () => {
    request.mockImplementation(() => Promise.reject(new Error('foobar')))
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.gatewayAccountExists(userToken.userId, BucketKey.DerivedData))
      .rejects.toThrowError()
  })

  test('failing to create a sync_gateway user should throw', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.createGatewayAccount(userToken.userId, BucketKey.Data))
      .rejects.toThrowError(SyncError)
  })
})

xdescribe('SyncService - createGatewaySessions', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({
      statusCode: 200,
      body: {
        session_id: 'session-id-foo'
      }
    }))
  })

  const userToken = {
    _id: 'foo',
    userId: 'User|bar',
    hasExpiry: false,
    token: 'baz',
    deviceId: 'potato',
    appId: 'blah'
  }

  test('removes existing sessions', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.patchStatusWithUserId = jest.fn(() => Promise.resolve())
    const sessionId = 'session-id-foo'

    await syncService.createGatewaySessions(userToken.userId, userToken.deviceId, {
      deviceSessions: {
        [userToken.deviceId]: {
          [BucketKey.Data]: sessionId
        }
      }
    } as any)
    expect(request.mock.calls[0][0]).toEqual({
      json: true,
      simple: false,
      method: 'DELETE',
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${config.gateway.ports.admin}/bkt/_user/User_bar/_session/${sessionId}`
    })
  })

  test('creates a session', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.patchStatusWithUserId = jest.fn(() => Promise.resolve())

    await syncService.createGatewaySessions(userToken.userId, userToken.deviceId, {
      deviceSessions: {
        [userToken.deviceId]: {
          [BucketKey.Data]: 'foo'
        }
      }
    } as any)

    const dataBucketURI = `http://${config.gateway.hostname}:${config.gateway.ports.admin}/bkt/_session`

    const foundDataCalls = [].concat.apply([], request.mock.calls.find((call: any) => call.find((arg: any) => arg.uri === dataBucketURI && arg.method === 'POST')))
    expect(foundDataCalls[0]).toEqual({
      method: 'POST',
      uri: dataBucketURI,
      body: {
        name: 'User_bar'
      },
      json: true,
      simple: false,
      resolveWithFullResponse: true
    })
  })

  test('saves created session to store', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.patchStatusWithUserId = jest.fn(() => Promise.resolve())
    const userStatusRepository = DIContainer.sharedContainer.userStatusRepository

    await syncService.createGatewaySessions(userToken.userId, userToken.deviceId, {
      deviceSessions: {}
    } as any)
    expect(userStatusRepository.patchStatusWithUserId).toHaveBeenCalled()
  })

  test('throws if session_id is missing', () => {
    request.mockImplementation(() => ({
      statusCode: 200,
      body: {
        theSessionIdProperty: 'not here'
      }
    }))
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.createGatewaySessions(userToken.userId, userToken.deviceId, { deviceSessions: {} } as any)).rejects.toThrowError(SyncError)
  })

  test('throws if the sync_gateway inAccessible', () => {
    request.mockImplementation(() => Promise.reject(new GatewayInaccessibleError('Fake induced fail.')))

    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.createGatewaySessions(userToken.userId, userToken.deviceId, { deviceSessions: {} } as any)).rejects.toThrowError(GatewayInaccessibleError)
  })
})

xdescribe('SyncService - removeGatewaySessions', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({
      statusCode: 200,
      body: { }
    }))
  })

  test('removes a session when in store', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.patchStatusWithUserId = jest.fn(() => Promise.resolve())

    await syncService.removeGatewaySessions('User|userId', 'potato', {
      deviceSessions: {
        potato: {
          [BucketKey.Data]: 'session-id-foo'
        }
      }
    } as any)

    const sessionURI = `http://${config.gateway.hostname}:${config.gateway.ports.admin}/bkt/_user/User_userId/_session/session-id-foo`

    const callSummary = request.mock.calls.map((x: any) => { return { uri: x[0].uri, method: x[0].method } })
    expect(callSummary.find((x: any) => x.uri === sessionURI && x.method === 'DELETE')).toEqual({
      method: 'DELETE',
      uri: sessionURI
    })
  })

  test('throws if removing a session fails', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.removeGatewaySessions('User|userId', 'potato', {
      deviceSessions: {
        potato: {
          [BucketKey.Data]: 'session-id-foo'
        }
      }
    } as any))
      .rejects.toThrowError(SyncError)
  })

  test('does not removes a session when not in store', async () => {
    const syncService = DIContainer.sharedContainer.syncService
    await syncService.removeGatewaySessions('User|userId', 'potato', {
      deviceSessions: {}
    } as any)
    expect(request).not.toHaveBeenCalled()
  })
})

xdescribe('SyncService - removeAllGatewaySessions', () => {
  test('removes all sessions', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.patchStatusWithUserId = jest.fn(() => Promise.resolve())

    await syncService.removeAllGatewaySessions('User|userId')
    const dataURI = `http://${config.gateway.hostname}:${config.gateway.ports.admin}/bkt/_user/User_userId/_session`
    const foundCalls = [].concat.apply([], request.mock.calls.find((call: any) => call.find((arg: any) => arg.uri === dataURI && arg.method === 'DELETE')))
    expect(foundCalls[0]).toEqual({
      json: true,
      simple: false,
      method: 'DELETE',
      resolveWithFullResponse: true,
      uri: dataURI
    })
  })

  test('throws if userId is not valid', () => {
    request.mockImplementationOnce(() => ({ statusCode: 400 }))
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.removeAllGatewaySessions('userId'))
      .rejects.toThrowError(ValidationError)
  })

  test('throws if fails to remove sessions ', () => {
    request.mockReset()
    request.mockImplementationOnce(() => ({ statusCode: 400 }))
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.patchStatusWithUserId = jest.fn(() => Promise.resolve())
    return expect(syncService.removeAllGatewaySessions('User|userId'))
      .rejects.toThrowError(SyncError)
  })

})

xdescribe('SyncService - createGatewayContributor', () => {
  beforeEach(() => {
    request.mockReset()
  })

  test('creates a contributor', async () => {
    request.mockImplementationOnce(() => ({ statusCode: 200 }))
    const user = {
      _id: 'User|foo',
      name: 'bar foo',
      email: 'foo@bar.com',
      isVerified: true
    }
    const syncService = DIContainer.sharedContainer.syncService
    await syncService.createGatewayContributor(user, BucketKey.Data)
    const req = request.mock.calls[0][0]
    expect(req.body._id).toContain('MPUserProfile:')
    delete req.body._id
    expect(req.body.bibliographicName._id).toContain('MPBibliographicName:')
    delete req.body.bibliographicName._id
    expect(req.body.createdAt).toBeGreaterThan(1541070000)
    expect(req.body.createdAt).toEqual(req.body.updatedAt)
    delete req.body.createdAt
    delete req.body.updatedAt
    expect(req).toEqual({
      json: true,
      simple: false,
      method: 'POST',
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${config.gateway.ports.admin}/bkt/`,
      body: {
        userID: 'User_foo',
        bibliographicName: {
          family: 'foo',
          given: 'bar',
          objectType: 'MPBibliographicName'
        },
        email: 'foo@bar.com',
        objectType: 'MPUserProfile'
      }
    })
  })

  test('parses contributor name correctly', async () => {
    request.mockImplementationOnce(() => ({ statusCode: 200 }))
    const user = {
      _id: 'User|foo',
      name: 'bar',
      email: 'foo@bar.com',
      isVerified: true
    }
    const syncService = DIContainer.sharedContainer.syncService
    await syncService.createGatewayContributor(user, BucketKey.Data)

    const dataBucketURI = `http://${config.gateway.hostname}:${config.gateway.ports.admin}/bkt/`
    const foundCalls = request.mock.calls.map((x: any) => { return { uri: x[0].uri, method: x[0].method } })

    expect(foundCalls.find((x: any) => x.uri === dataBucketURI && x.method === 'POST'))
                     .toEqual({ method: 'POST', uri: dataBucketURI })
  })

  test('failing to create a contributor should throw', () => {
    request.mockImplementationOnce(() => ({ statusCode: 400 }))
    const user = {
      _id: 'User|userId',
      name: 'bar',
      email: 'foo@bar.com',
      isVerified: true
    }
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.createGatewayContributor(user, BucketKey.Data)).rejects.toThrowError(SyncError)
  })

  test('failing to create a contributor when the sync_gateway inAccessible', () => {
    request.mockImplementation(() => Promise.reject(new GatewayInaccessibleError('Fake induced fail.')))
    const user = {
      _id: 'User|userId',
      name: 'bar',
      email: 'foo@bar.com',
      isVerified: true
    }
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.createGatewayContributor(user, BucketKey.Data)).rejects.toThrowError(GatewayInaccessibleError)
  })
})

xdescribe('SyncService - removeGatewayAccount', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200 }))
  })

  const userToken = {
    _id: 'foo',
    userId: 'User|bar',
    hasExpiry: false,
    token: 'baz',
    deviceId: 'potato',
    appId: 'blah'
  }

  test('remove sync_gateway user', async () => {
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.userStatusRepository.fullyQualifiedId = (id: string) => `UserStatus|${id}`
    syncService.removeAllGatewaySessions = (_id: string) => jest.fn()

    await syncService.removeGatewayAccount(userToken.userId)
    const payload = request.mock.calls[0][0]

    expect(payload).toEqual({
      json: true,
      method: 'DELETE',
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${config.gateway.ports.admin}/bkt/_user/User_bar`,
      simple: false
    })
  })

  test('failing to remove a sync_gateway user should throw', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const syncService: any = DIContainer.sharedContainer.syncService
    syncService.removeAllGatewaySessions = (_id: string) => jest.fn()
    return expect(syncService.removeGatewayAccount(userToken.userId)).rejects.toThrowError(SyncError)
  })
})

xdescribe('SyncService - username', () => {
  test('throws if the username is not starting with User|', () => {
    request.mockImplementationOnce(() => ({ statusCode: 400 }))
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.removeAllGatewaySessions('userId')).rejects.toThrowError(ValidationError)
  })
})
