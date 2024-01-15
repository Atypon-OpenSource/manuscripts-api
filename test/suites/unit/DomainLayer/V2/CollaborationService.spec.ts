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

import { schema } from '@manuscripts/transform'
import { Prisma } from '@prisma/client'
import { Step } from 'prosemirror-transform'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { CollaborationService } from '../../../../../src/DomainServices/Collaboration/CollaborationService'
import { DocumentService } from '../../../../../src/DomainServices/Document/DocumentService'
import { DocumentHistoryService } from '../../../../../src/DomainServices/DocumentHistory/DocumentHistoryService'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let documentService: DocumentService
let documentHistoryService: DocumentHistoryService
let collaborationService: CollaborationService

beforeEach(async () => {
  ; (DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  documentService = DIContainer.sharedContainer.documentService
  documentHistoryService = DIContainer.sharedContainer.documentHistoryService
  collaborationService = DIContainer.sharedContainer.collaborationService
})
afterEach(() => {
  jest.clearAllMocks()
})

const step = {
  stepType: 'replace',
  from: 380,
  to: 380,
  slice: {
    content: [
      {
        type: 'text',
        text: ' ',
      },
    ],
  },
}

const hydrateSteps = (jsonSteps: Prisma.JsonValue[]): Step[] => {
  return jsonSteps.map((step: Prisma.JsonValue) => Step.fromJSON(schema, step)) as Step[]
}

describe('CollaborationService', () => {
  describe('receiveSteps', () => {
    it('should return an error if the document is not found', async () => {
      documentService.findDocument = jest
        .fn()
        .mockResolvedValueOnce({ err: 'Document not found', code: 404 })
      const result = await collaborationService.receiveSteps('documentID', {
        steps: [],
        version: 0,
        clientID: 'clientID',
      })
      expect(result).toEqual({ err: 'Document not found', code: 404 })
    })
    it('should return an error if the version is not the latest', async () => {
      documentService.findDocument = jest.fn().mockResolvedValueOnce({ data: { version: 1 } })
      const result = await collaborationService.receiveSteps('documentID', {
        steps: [],
        version: 0,
        clientID: 'clientID',
      })
      expect(result).toEqual({
        err: 'Update denied, version is 1, and client version is 0',
        code: 409,
      })
    })
    it('should return an error if the document history creation fails', async () => {
      documentService.findDocument = jest.fn().mockResolvedValueOnce({ data: { version: 0 } })
      collaborationService['applyStepsToDocument'] = jest
        .fn()
        .mockResolvedValue({ data: { version: 0 } })
      documentHistoryService.createDocumentHistory = jest
        .fn()
        .mockResolvedValueOnce({ err: 'Failed to save document history', code: 500 })
      const result = await collaborationService.receiveSteps('documentID', {
        steps: [],
        version: 0,
        clientID: 'clientID',
      })
      expect(result).toEqual({ err: 'Failed to save document history', code: 500 })
    })
    it('should return the history if the document history creation succeeds', async () => {
      documentService.findDocument = jest.fn().mockResolvedValueOnce({ data: { version: 0 } })
      collaborationService['applyStepsToDocument'] = jest.fn().mockResolvedValue({ data: {} })
      documentHistoryService.createDocumentHistory = jest.fn().mockResolvedValueOnce({ data: {} })
      const result = await collaborationService.receiveSteps('documentID', {
        steps: ['step1'],
        version: 0,
        clientID: '123',
      })
      expect(result).toEqual({
        data: {
          steps: ['step1'],
          clientIDs: [123],
          version: 1,
        },
      })
    })
  })

  describe('getDocumentHistory', () => {
    it('should return an error if the document is not found', async () => {
      documentService.findDocument = jest
        .fn()
        .mockResolvedValue({ err: 'Document not found', code: 404 })
      const result = await collaborationService.getDocumentHistory('documentID', 0)
      expect(result).toEqual({ err: 'Document not found', code: 404 })
    })
    it('should return default initial document and history if the document history is not found', async () => {
      documentService.findDocument = jest.fn().mockResolvedValueOnce({ data: {} })
      documentHistoryService.findDocumentHistories = jest
        .fn()
        .mockResolvedValue({ err: 'No history found', code: 404 })
      const result = await collaborationService.getDocumentHistory('documentID', 0)
      expect(result).toEqual({
        data: {
          steps: [],
          clientIDs: [],
          version: 0,
          doc: undefined,
        },
      })
    })
    it('should return the document and history if the document history is found', async () => {
      documentService.findDocument = jest.fn().mockResolvedValueOnce({ data: {} })
      documentHistoryService.findDocumentHistories = jest
        .fn()
        .mockResolvedValueOnce({ data: [{ steps: [step], client_id: '123', version: 1 }] })
      documentService.findDocumentVersion = jest
        .fn()
        .mockResolvedValueOnce({ data: { version: 1 } })
      const result = await collaborationService.getDocumentHistory('documentID', 0)
      expect(result).toEqual({
        data: {
          steps: hydrateSteps([step]),
          clientIDs: [123],
          version: 1,
          doc: undefined,
        },
      })
    })
  })
  describe('getCombinedHistoriesFromVersion', () => {
    it('should return an error if the document history is not found', async () => {
      documentHistoryService.findDocumentHistories = jest
        .fn()
        .mockResolvedValue({ err: 'No history found', code: 404 })
      const result = await collaborationService.getHistoriesFromVersion('documentID', 0)
      expect(result).toEqual({ err: 'No history found', code: 404 })
    })
    it('should return the combined histories if the document history is found', async () => {
      documentHistoryService.findDocumentHistories = jest
        .fn()
        .mockResolvedValue({ data: [{ steps: [step], client_id: '123', version: 1 }] })
      documentService.findDocumentVersion = jest
        .fn()
        .mockResolvedValueOnce({ data: { version: 1 } })
      const result = await collaborationService.getHistoriesFromVersion('documentID', 0)
      expect(result).toEqual({
        data: {
          steps: hydrateSteps([step]),
          clientIDs: [123],
          version: 1,
        },
      })
    })
  })
  describe('getCombinedHistories', () => {
    it('should return an error if the document history is not found', async () => {
      documentHistoryService.findDocumentHistories = jest
        .fn()
        .mockResolvedValue({ err: 'No history found', code: 404 })
      const result = await collaborationService['getCombinedHistories']('documentID', 0)
      expect(result).toEqual({ err: 'No history found', code: 404 })
    })
    it('should return the combined histories if the document history is found', async () => {
      documentHistoryService.findDocumentHistories = jest
        .fn()
        .mockResolvedValue({ data: [{ steps: [step], client_id: '123', version: 1 }] })
      const result = await collaborationService['getCombinedHistories']('documentID', 0)
      expect(result).toEqual({
        data: {
          steps: [step],
          clientIDs: [123],
        },
      })
    })
  })
})
