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

import { PrismaClient } from '@prisma/client'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { AuthorityService } from '../../../../../src/DomainServices/AuthorityService'
import { MissingDocumentError, VersionMismatchError } from '../../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let authorityService: AuthorityService

beforeEach(async () => {
  jest
    .spyOn(PrismaClient.prototype, '$connect')
    .mockImplementation(jest.fn().mockResolvedValue(undefined))
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  authorityService = DIContainer.sharedContainer.authorityService
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
  clientID: '123'
}

describe('CollaborationService', () => {
  describe('receiveSteps', () => {
    it('should successfully receive and apply steps', async () => {
      const documentID = 'some-doc-id'
      const mockTransactionClient = {
        manuscriptDoc: {
          findDocument: jest.fn().mockResolvedValue({
            version: 0,
            steps: [],
          }),
          updateDocument: jest.fn(),
        },
      }
      jest
        .spyOn(PrismaClient.prototype, '$transaction')
        .mockImplementation((fn: (tx: any) => Promise<any>) => fn(mockTransactionClient))
      authorityService['applyStepsToDocument'] = jest.fn().mockReturnValue({
        doc: {},
        modifiedSteps: [step],
      })
      const result = await DIContainer.sharedContainer.authorityService.receiveSteps(documentID, {
        clientID: 123,
        steps: [step],
        version: 0,
      })

      expect(mockTransactionClient.manuscriptDoc.findDocument).toHaveBeenCalledWith(documentID)
      expect(mockTransactionClient.manuscriptDoc.updateDocument).toHaveBeenCalledWith(
        documentID,
        expect.objectContaining({
          version: 1,
          steps: [step],
        })
      )
      expect(result).toHaveProperty('steps', [step])
    })
    it('should throw an error if the document is not found', async () => {
      const mockTransactionClient = {
        manuscriptDoc: {
          findDocument: jest.fn().mockRejectedValue(new MissingDocumentError('documentID')),
        },
      }
      jest
        .spyOn(PrismaClient.prototype, '$transaction')
        .mockImplementation((fn: (tx: any) => Promise<any>) => fn(mockTransactionClient))
      await expect(
        authorityService.receiveSteps('documentID', {
          steps: [],
          version: 0,
          clientID: 123,
        })
      ).rejects.toThrow(new MissingDocumentError('documentID'))
    })
    it('should throw an error if the version is not the latest', async () => {
      const mockTransactionClient = {
        manuscriptDoc: {
          findDocument: jest.fn().mockResolvedValue({ version: 1 }),
        },
      }
      jest
        .spyOn(PrismaClient.prototype, '$transaction')
        .mockImplementation((fn: (tx: any) => Promise<any>) => fn(mockTransactionClient))
      authorityService['applyStepsToDocument'] = jest.fn()
      await expect(
        authorityService.receiveSteps('documentID', {
          steps: [],
          version: 0,
          clientID: 123,
        })
      ).rejects.toThrow(new VersionMismatchError(1))
    })
  })
  describe('getEvents', () => {
    it('should fetch document with history when all info is correct', async () => {
      const documentID = 'doc123'
      const versionID = 0
      const mockDocument = {
        steps: [step],
        version: 1,
        doc: 'mockDoc',
      }
      DIContainer.sharedContainer.repository.DB.manuscriptDoc.findDocument = jest
        .fn()
        .mockResolvedValue(mockDocument)

      const result = await authorityService.getEvents(documentID, versionID, true)

      expect(
        DIContainer.sharedContainer.repository.DB.manuscriptDoc.findDocument
      ).toHaveBeenCalledWith(documentID)
      expect(result).toHaveProperty('doc', 'mockDoc')
      expect(result.steps.length).toBe(1)
      expect(result.clientIDs).toEqual([123])
    })
  })
})
