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

import { testDatabase } from '../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { MemorizingRepository } from '../../../../../src/DataAccess/MemorizingRepository/MemorizingRepository'
import { ClientApplication, ClientApplicationQueryCriteria } from '../../../../../src/Models/ClientApplicationModels'
import { ClientApplicationRepository } from '../../../../../src/DataAccess/ClientApplicationRepository/ClientApplicationRepository'
import { validApplication } from '../../../../data/fixtures/applications'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

describe('MemorizingRepository getById', () => {

  test('should return data from database if key does not exist in the cache and does not cache the data if it is null', async () => {
    const repository: any = new MemorizingRepository<ClientApplication, ClientApplication, ClientApplication, ClientApplicationQueryCriteria>(new ClientApplicationRepository(db), 1)
    repository.repository.getById = jest.fn(() => Promise.resolve(null))
    repository.cacheTTLSeconds = 0.5
    await repository.getById(validApplication._id as string)
    expect(repository.repository.getById).toBeCalled()

    // the mock is replaced so that we can call toBeCalled() again to determine it was *not* called within the TTL period.
    repository.repository.getById = jest.fn(() => Promise.resolve('derp'))
    await new Promise((resolve) => { setTimeout(() => { resolve() }, 200) })
    const appIDAfter200ms = await repository.getById(validApplication._id as string)
    expect(appIDAfter200ms).toEqual(null) // the OLD memoized value is returned (not 'derp')
    expect(repository.repository.getById).not.toBeCalled()

    // the mock is replaced so that we can call toBeCalled() again to determine it *was* called after the TTL period ended.
    repository.repository.getById = jest.fn(() => Promise.resolve('herp'))
    await new Promise((resolve) => { setTimeout(() => { resolve() }, 600) })
    const appIDAfter800ms = await repository.getById(validApplication._id as string)
    expect(appIDAfter800ms).toEqual('herp')
    expect(repository.repository.getById).toBeCalled()
  })

  test('should return data from database if key does not exist in the cache and cache the data if it is not null', async () => {
    const repository: any = new MemorizingRepository<ClientApplication, ClientApplication, ClientApplication, ClientApplicationQueryCriteria>(new ClientApplicationRepository(db), 1)
    repository.repository.getById = jest.fn(() => validApplication)
    await repository.getById(validApplication._id as string)

    expect(repository.repository.getById).toBeCalled()
  })

  test('should return data from cache if key is exist in the cache', async () => {
    const clientRepo = new ClientApplicationRepository(db)
    const newApplication = await clientRepo.create({ details: 'foo', name: 'bar', secret: '12345', _type: 'Application' }, {})
    clientRepo.getById = jest.fn(async () => newApplication)
    const memorizingRepo: any = new MemorizingRepository<ClientApplication, ClientApplication, ClientApplication, ClientApplicationQueryCriteria>(clientRepo, 1)

    await memorizingRepo.getById(newApplication._id)
    await memorizingRepo.getById(newApplication._id)

    expect(memorizingRepo.repository.getById).toHaveBeenCalledTimes(1)
  })
})
