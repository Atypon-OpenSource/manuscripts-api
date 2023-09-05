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

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { DatabaseError, ValidationError } from '../../../../../src/Errors'
import {
  ClientApplication,
  clientApplicationsFromSplitString,
} from '../../../../../src/Models/ClientApplicationModels'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

afterEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('Creating application records', () => {
  test('succeeds with valid configuration values', async () => {
    const apps: Array<ClientApplication> = clientApplicationsFromSplitString(
      'x,y,z;y,u,v',
      ';',
      ','
    )
    expect(apps).toBeTruthy()
    await DIContainer.sharedContainer.applicationRepository.ensureApplicationsExist(apps)
    const recoveredApps = await DIContainer.sharedContainer.applicationRepository.getAll(
      {},
      { skip: 0, limit: 0, ascOrderBy: [], descOrderBy: [] }
    )
    expect(recoveredApps.length).toBeGreaterThanOrEqual(2)
    const x = (await DIContainer.sharedContainer.applicationRepository.getById(
      'x'
    )) as ClientApplication
    expect(x._id).toEqual('x')
    expect(x.secret).toEqual('y')
    expect(x.name).toEqual('z')

    const y = (await DIContainer.sharedContainer.applicationRepository.getById(
      'y'
    )) as ClientApplication
    expect(y._id).toEqual('y')
    expect(y.secret).toEqual('u')
    expect(y.name).toEqual('v')
  })

  test('fails if there is a backend error', () => {
    DIContainer.sharedContainer.userBucket.bucket.upsert = (_id: string, _doc: any) =>
      Promise.reject(new Error('backend derp'))

    const apps = clientApplicationsFromSplitString('x,y,z;y,u,v', ';', ',')
    expect(apps.length).toEqual(2)
    return expect(
      DIContainer.sharedContainer.applicationRepository.ensureApplicationsExist(apps)
    ).rejects.toThrow(DatabaseError)
  })

  test('fails if the client applications string is invalid', () => {
    return expect(() => {
      const apps = clientApplicationsFromSplitString('x,y;y,u', ';', ',')
      fail(`This should have never been visited: ${apps}`)
    }).toThrow(ValidationError)
  })
})
