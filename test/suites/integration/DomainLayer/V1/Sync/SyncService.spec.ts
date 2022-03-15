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
    await dropBucket(BucketKey.Project)
    await seed(seedOptions)
  })

  test('should create a gateway account', async () => {
    const syncService = DIContainer.sharedContainer.syncService
    const sgUsername = await syncService.createGatewayAccount(userId, BucketKey.Project)
    
    expect(sgUsername).toEqual('UserStatus|User|valid-user@manuscriptsapp.com')

    // create `MPProject:bar` as a container for the document.
    /*const project: Project = {
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
    expect(response.statusCode).toEqual(200)*/
  })

  test('should successfully create a UserProfile', () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.createGatewayContributor({
      _id: 'User|1',
      name:  'Foo Bar',
      email: 'sads@example.com'
    } as any, BucketKey.Project)).resolves.not.toBeUndefined()
  })

  test('should successfully create a UserProfile with no name', () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(syncService.createGatewayContributor({
      _id: 'User|1',
      name:  '',
      email: 'sads'
    } as any, BucketKey.Data)).resolves.not.toBeUndefined()
  })


  test('should fail to remove a user which does not exist in gateway', () => {
    const syncService = DIContainer.sharedContainer.syncService
    return expect(
      syncService.removeGatewayAccount('User|doesnt-exist')
    ).rejects.toThrow(Error)
  })

  test('should be alive :p', async () => {
    return expect(SyncService.isAlive()).resolves.toBeTruthy()
  })
})
