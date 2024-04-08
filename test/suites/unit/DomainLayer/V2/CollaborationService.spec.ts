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
import { Prisma, PrismaClient } from '@prisma/client'
import { Step } from 'prosemirror-transform'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { Authority } from '../../../../../src/DomainServices/Authority/Authority.js'
import { DocumentService } from '../../../../../src/DomainServices/Document/DocumentService'
import { DocumentHistoryService } from '../../../../../src/DomainServices/DocumentHistory/DocumentHistoryService'
import { MissingDocumentError, VersionMismatchError } from '../../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let documentService: DocumentService
let documentHistoryService: DocumentHistoryService
let collaborationService: Authority
let mockPrisma: jest.Mocked<PrismaClient>

beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  documentService = DIContainer.sharedContainer.documentService
  documentHistoryService = DIContainer.sharedContainer.documentHistoryService
  collaborationService = DIContainer.sharedContainer.authorityService
  mockPrisma = new PrismaClient() as any
  mockPrisma.$transaction = jest.fn()
})
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    $use: jest.fn(),
  }
  const mPrisma = {
    TransactionIsolationLevel: { Serializable: 'SERIALIZABLE' },
  }
  return { PrismaClient: jest.fn(() => mPrismaClient), Prisma: mPrisma }
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
    it('should throw an error if the document is not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma)
      })
      documentService.findDocument = jest
        .fn()
        .mockRejectedValue(new MissingDocumentError('documentID'))
      await expect(
        collaborationService.receiveSteps('documentID', {
          steps: [],
          version: 0,
          clientID: 123,
        })
      ).rejects.toThrow(new MissingDocumentError('documentID'))
    })
    it('should throw an error if the version is not the latest', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma)
      })
      documentService.findDocument = jest.fn().mockResolvedValue({ version: 1 })
      collaborationService['applyStepsToDocument'] = jest.fn()
      await expect(
        collaborationService.receiveSteps('documentID', {
          steps: [],
          version: 0,
          clientID: 123,
        })
      ).rejects.toThrow(new VersionMismatchError(1))
    })
    it('should throw an error if the document history creation fails', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma)
      })
      documentService.findDocument = jest.fn().mockResolvedValue({})
      documentService.updateDocument = jest.fn().mockResolvedValue({})
      collaborationService['applyStepsToDocument'] = jest.fn()
      documentService.findDocumentVersion = jest.fn().mockResolvedValue(0)
      documentHistoryService.createDocumentHistory = jest
        .fn()
        .mockRejectedValue(new Error('Failed to create document history'))
      await expect(
        collaborationService.receiveSteps('documentID', {
          steps: [],
          version: 0,
          clientID: 123,
        })
      ).rejects.toThrow(new Error('Failed to create document history'))
    })
    it('should return the history if the document history creation succeeds', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma)
      })
      documentService.findDocument = jest.fn().mockResolvedValue({})
      documentService.findDocumentVersion = jest.fn().mockResolvedValue(0)
      documentService.updateDocument = jest.fn().mockResolvedValue({})
      collaborationService['applyStepsToDocument'] = jest.fn().mockResolvedValue({})
      documentHistoryService.createDocumentHistory = jest.fn().mockResolvedValue({})
      const result = await collaborationService.receiveSteps('documentID', {
        steps: ['step1'],
        version: 0,
        clientID: 123,
      })
      expect(result).toEqual({
        steps: ['step1'],
        clientIDs: [123],
        version: 1,
      })
    })
  })
  describe('getHistoriesFromVersion', () => {
    it('should return the combined histories if the document history is found', async () => {
      documentHistoryService.findDocumentHistories = jest
        .fn()
        .mockResolvedValue([{ steps: [step], client_id: '123', version: 1 }])
      documentService.findDocumentVersion = jest.fn().mockResolvedValueOnce(1)
      const result = await collaborationService.getEvents('documentID', 0)
      expect(result).toEqual({
        steps: hydrateSteps([step]),
        clientIDs: [123],
        version: 1,
      })
    })
  })
  describe('getCombinedHistories', () => {
    it('should return the combined histories if the document history is found', async () => {
      documentHistoryService.findDocumentHistories = jest
        .fn()
        .mockResolvedValue([{ steps: [step], client_id: '123', version: 1 }])
      const result = await collaborationService['getCombinedHistories']('documentID', 0)
      expect(result).toEqual({
        steps: [step],
        clientIDs: [123],
      })
    })
  })
})
