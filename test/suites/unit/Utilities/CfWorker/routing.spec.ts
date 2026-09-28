/*!
 * © 2026 Atypon Systems LLC
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
import '../../../../utilities/dbMock'

import { getVersion } from '@manuscripts/transform'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { resolveV3Route } from '../../../../../src/Utilities/CfWorker/routing'

let documentClient: { findDocument: jest.Mock }

beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  documentClient = DIContainer.sharedContainer.documentClient as any
})

describe('resolveV3Route', () => {
  it('treats manuscriptID "v3" as a sentinel and never touches Prisma', async () => {
    documentClient.findDocument = jest.fn()

    const route = await resolveV3Route('raw-v3-doc-id', 'v3')

    expect(route).toEqual({ proxied: true, docID: 'raw-v3-doc-id', schemaVersion: getVersion() })
    expect(documentClient.findDocument).not.toHaveBeenCalled()
  })

  it('proxies a document flagged migratedToV3, building the docID from project+manuscript', async () => {
    documentClient.findDocument = jest.fn().mockResolvedValue({
      migratedToV3: true,
      schema_version: '3.2.1',
    })

    const route = await resolveV3Route('project-1', 'manuscript-1')

    expect(route).toEqual({
      proxied: true,
      docID: 'project-1#manuscript-1',
      schemaVersion: '3.2.1',
    })
  })

  it('falls back to getVersion() when a migrated row has no schema_version', async () => {
    documentClient.findDocument = jest.fn().mockResolvedValue({
      migratedToV3: true,
      schema_version: null,
    })

    const route = await resolveV3Route('project-1', 'manuscript-1')

    expect(route).toEqual({
      proxied: true,
      docID: 'project-1#manuscript-1',
      schemaVersion: getVersion(),
    })
  })

  it('returns the local document unproxied when migratedToV3 is false', async () => {
    const localDocument = { migratedToV3: false, manuscript_model_id: 'manuscript-1' }
    documentClient.findDocument = jest.fn().mockResolvedValue(localDocument)

    const route = await resolveV3Route('project-1', 'manuscript-1')

    expect(route).toEqual({ proxied: false, localDocument })
  })

  it('propagates MissingDocumentError for a manuscriptID that does not exist locally', async () => {
    documentClient.findDocument = jest.fn().mockRejectedValue(new Error('Document not found'))

    await expect(resolveV3Route('project-1', 'nonexistent')).rejects.toThrow('Document not found')
  })
})
