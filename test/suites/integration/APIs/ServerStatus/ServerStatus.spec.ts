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

import { StatusCodes } from 'http-status-codes'
import * as supertest from 'supertest'
import * as url from 'url'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { getAppVersion, getRoot } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

const pjson = require('../../../../../package.json')

beforeAll(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('ServerStatusRoute - version', () => {
  test('should match package.json version', async () => {
    const appVersionResponse: supertest.Response = await getAppVersion({})
    expect(appVersionResponse.status).toBe(StatusCodes.OK)
    expect(JSON.parse(appVersionResponse.text).version).toEqual(pjson.version)
  })

  test('root redirects to version endpoint', async () => {
    const rootResponse: supertest.Response = await getRoot({})
    expect(rootResponse.status).toBe(StatusCodes.MOVED_TEMPORARILY)
    const responseURL = url.parse(rootResponse.get('location'))
    expect(responseURL.path).toEqual('/api/v1/app/version')
  })
})
