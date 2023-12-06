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
import '../../../../utilities/dbMock.ts'
import '../../../../utilities/configMock.ts'

import fs from 'fs'
import path from 'path'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { ConfigService } from '../../../../../src/DomainServices/ConfigService'
import { sectionCategories } from '../../../../data/fixtures/section-categories'

let configService: ConfigService
beforeEach(async () => {
  // @ts-ignore
  jest.spyOn(fs.promises, 'readFile').mockImplementation((path) => {
    const filePath = path.toString()
    if (filePath.includes('bundles.json')) {
      return Promise.resolve(JSON.stringify([{ _id: 'bundle1' }, { _id: 'bundle2' }]))
    }
    if (filePath.includes('templates.json')) {
      return Promise.resolve(JSON.stringify([{ _id: 'template1' }, { _id: 'template2' }]))
    }
    if (filePath.includes('section-categories.json')) {
      return Promise.resolve(JSON.stringify(sectionCategories))
    }
    if (filePath.includes('csl/styles')) {
      return Promise.resolve('"styleData"')
    }
    if (filePath.includes('csl/locales')) {
      return Promise.resolve('"localeData"')
    }
  })
  // @ts-ignore
  jest.spyOn(fs.promises, 'readdir').mockImplementation((path) => {
    const filePath = path.toString()

    if (filePath.includes('csl/styles')) {
      return Promise.resolve(['style1.csl', 'style2.csl'])
    }
    if (filePath.includes('csl/locales')) {
      return Promise.resolve(['locales-en-US.xml'])
    }
  })
  jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'))
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  configService = DIContainer.sharedContainer.configService
})

describe('ConfigService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('init', () => {
    it('should correctly initialize the store', async () => {
      const store = await configService['store']
      expect(store.get('bundle1')).toEqual('{"_id":"bundle1"}')
      expect(store.get('bundle2')).toEqual('{"_id":"bundle2"}')
      expect(store.get('template1')).toEqual('{"_id":"template1"}')
      expect(store.get('template2')).toEqual('{"_id":"template2"}')
      expect(store.get('section-categories')).toEqual(JSON.stringify(sectionCategories))
      expect(store.get('style1')).toEqual('"styleData"')
      expect(store.get('style2')).toEqual('"styleData"')
      expect(store.get('en-US')).toEqual('"localeData"')
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
      const store = await configService['store']
      expect(store.get('section-categories')).toEqual(JSON.stringify(sectionCategories))
    })

    it('should return undefined for a non-existing ID', async () => {
      const store = await configService['store']
      expect(store.get('non-existing-id')).toBeUndefined()
    })
  })
})
