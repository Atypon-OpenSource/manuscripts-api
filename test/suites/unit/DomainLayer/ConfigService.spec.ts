/*!
 * © 2023 Atypon Systems LLC
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
import '../../../utilities/dbMock.ts'
import '../../../utilities/configMock.ts'

import { DIContainer } from '../../../../src/DIContainer/DIContainer'
import { ConfigService } from '../../../../src/DomainServices/ConfigService'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'

let configService: ConfigService

beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  configService = DIContainer.sharedContainer.configService
})
afterEach(() => {
  jest.clearAllMocks()
})
jest.setTimeout(TEST_TIMEOUT)

describe('ConfigService', () => {
  describe('init', () => {
    it('should correctly initialize the store', async () => {
      const store = await configService['store']
      expect(store.size).toEqual(10)
    })
  })
  describe('index', () => {
    it('should create the correct index map', async () => {
      const models = [{ _id: 'model1' }, { _id: 'model2' }]
      const index = configService['index'](models)
      expect(index.size).toBe(2)
      expect(index.get('model1')).toEqual(JSON.stringify({ _id: 'model1' }))
      expect(index.get('model2')).toEqual(JSON.stringify({ _id: 'model2' }))
    })
  })
  describe('getDocument', () => {
    it('should return the correct data', async () => {
      const data = await configService.getDocument(
        'MPBundle:www-zotero-org-styles-american-medical-association'
      )
      expect(data).toEqual(
        JSON.stringify({
          _id: 'MPBundle:www-zotero-org-styles-american-medical-association',
          objectType: 'MPBundle',
          csl: { _id: 'MPCitationStyle:www-zotero-org-styles-american-medical-association' },
        })
      )
    })

    it('should return undefined for a non-existing ID', async () => {
      const data = await configService.getDocument('non-existing-id')
      expect(data).toBeUndefined()
    })
  })
})
