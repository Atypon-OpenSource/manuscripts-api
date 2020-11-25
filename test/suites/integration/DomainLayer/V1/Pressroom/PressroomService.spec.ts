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

import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import archiver from 'archiver'
import getStream from 'get-stream'
import decompress from 'decompress'
import * as fs from 'fs'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('PressroomService - import JATS', () => {
  test('should get a valid manuproj back from pressroom', async () => {
    const pressroomService = DIContainer.sharedContainer.pressroomService

    const archive = fs.createReadStream('test/data/fixtures/jats-arc.zip')
    const manuproj = await pressroomService.importJATS(archive)
    const buffer = await getStream.buffer(manuproj)
    expect(buffer.length).toBeGreaterThan(0)

    const files = await decompress(buffer,'/tmp/manuscriptZip')
    expect(files.length).toBeGreaterThan(0)

    const byPath: any = files.reduce((acc,v) => ({ ...acc,[v.path]: v }),{})

    const json = JSON.parse(byPath['index.manuscript-json'].data)
    expect(json.data).toBeDefined()
  })

  test('should fail to import zip (Manuscript file not found)', async () => {
    const pressroomService = DIContainer.sharedContainer.pressroomService
    const archive = archiver('zip')
    await archive.finalize()
    await expect(pressroomService.importJATS(archive)).rejects.toThrow()
  })

  test('should fail to fetch html bundle (Error: ENOENT)', async () => {
    const pressroomService = DIContainer.sharedContainer.pressroomService
    const archive = archiver('zip')
    await archive.finalize()
    const buffer = await getStream.buffer(archive)
    await expect(pressroomService.fetchHtml(buffer, 'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'))
      .rejects.toThrow()
  })

  test('should get html back from pressroom', async () => {
    const pressroomService = DIContainer.sharedContainer.pressroomService
    const archive = archiver('zip')
    archive.append(fs.createReadStream('test/data/fixtures/sample/index.manuscript-json'), { name: 'index.manuscript-json' })
    archive.append('123', { name: 'Data/MPFigure_C9A3CBCE-4AF4-4AD2-97B0-D2848BEFDE5A' })
    await archive.finalize()
    const buffer = await getStream.buffer(archive)
    const result = await pressroomService.fetchHtml(buffer, 'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232')
    expect(result.length).toBeGreaterThan(0)
    const files = await decompress(result,'/tmp/htmlZip')
    const byPath: any = files.reduce((acc,v) => ({ ...acc,[v.path]: v }),{})
    expect(byPath['manuscript.html']).toBeDefined()
  })
})
