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

import request from 'request-promise-native'
import { Chance } from 'chance'

import { drop, seed, testDatabase, dropBucket } from '../../../../../utilities/db'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { BucketKey } from '../../../../../../src/Config/ConfigurationTypes'
import { GATEWAY_BUCKETS, SyncService } from '../../../../../../src/DomainServices/Sync/SyncService'
import { appDataPublicGatewayURI, appDataAdminGatewayURI } from '../../../../../../src/Config/ConfigAccessors'
import { RecordNotFoundError } from '../../../../../../src/Errors'
import { Section, Project } from '@manuscripts/manuscripts-json-schema'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { SeedOptions } from '../../../../../../src/DataAccess/Interfaces/SeedOptions'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
const seedOptions: SeedOptions = { users: true }

beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

const userId = 'User|valid-user@manuscriptsapp.com'

describe('SyncService', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('should create a session which allows POSTing a document', async () => {
    const syncService = DIContainer.sharedContainer.syncService
    const [sgUsername] = await Promise.all(GATEWAY_BUCKETS.map(key =>
      syncService.createGatewayAccount(userId, key))
    )

    const sessions = await syncService.createGatewaySessions(
      userId,
      'deviceId',
      { deviceSessions: {} } as any
    )

    // create `MPProject:bar` as a container for the document.
    const project: Project = {
      _id: 'MPProject:bar',
      objectType: 'MPProject',
      owners: [ sgUsername ],
      writers: [],
      viewers: [],
      createdAt: (new Chance()).timestamp(),
      updatedAt: (new Chance()).timestamp()
    }

    await request({
      method: 'POST',
      uri: `${appDataAdminGatewayURI(BucketKey.Data)}/`,
      body: project,
      json: true
    })

    const sectionID = `MPSection:${new Chance().guid()}`
    const payload: Section = {
      _id: sectionID,
      objectType: 'MPSection',
      manuscriptID: 'MPManuscript:x',
      containerID: 'MPProject:bar', // due to this containerID value (that matches the _id of the project created above) the document is allowed to be written by the user.
      sessionID: `${new Chance().guid()}`,
      createdAt: (new Chance()).timestamp(),
      updatedAt: (new Chance()).timestamp(),
      priority: 0,
      path: [sectionID]
    }

    const options: any = {
      method: 'POST',
      uri: `${appDataPublicGatewayURI(BucketKey.Data)}/`,
      body: payload,
      json: true,
      resolveWithFullResponse: true,
      headers: {
        Cookie: `SyncGatewaySession=${sessions.data}`
      }
    }

    const response = await request(options)
    expect(response.statusCode).toEqual(200)
  })

  test('should successfully create a UserProfile', () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.createGatewayContributor({
      _id: 'User|1',
      name:  'Foo Bar',
      email: 'sads@example.com'
    } as any, BucketKey.Data)).resolves.toBeUndefined()
  })

  test('should successfully create a UserProfile with no name', () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.createGatewayContributor({
      _id: 'User|1',
      name:  '',
      email: 'sads'
    } as any, BucketKey.Data)).resolves.toBeUndefined()
  })

  test("should fail to create a session when account hasn't been created", () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(
      syncService.createGatewaySessions(
        'doesnt-exist',
        'deviceId',
        { deviceSessions: {} } as any
      )
    ).rejects.toThrow()
  })

  test("should fail to remove a session which doesn't exist in gateway", () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(
      syncService.removeGatewaySessions(
        'doesnt-exist',
        'deviceId',
        { deviceSessions: { deviceId: ['badSessionId'] } } as any
      )
    ).rejects.toThrow()
  })

  test("should fail to remove a session which doesn't exist in gateway", () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(
      syncService.removeAllGatewaySessions('doesnt-exist')
    ).rejects.toThrow()
  })

  test('should fail to remove a user which does not exist in gateway', () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(
      syncService.removeGatewayAccount('User|doesnt-exist')
    ).rejects.toThrow(RecordNotFoundError)
  })

  test('should not work without valid session', () => {
    const options = {
      method: 'POST',
      uri: `${appDataPublicGatewayURI(BucketKey.Data)}/`,
      body: { foo: 1 },
      json: true,
      resolveWithFullResponse: true,
      headers: {
        Cookie: `SyncGatewaySession=hack-the-planet`
      }
    }
    return expect(request(options)).rejects.toThrowError()
  })

  test('should be alive :p', async () => {
    return expect(SyncService.isAlive()).resolves.toBeTruthy()
  })
})
