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

// import '../../../../../utilities/configMock'
import '../../../../../utilities/dbMock'

import { DocumentController } from '../../../../../../src/Controller/V2/Document/DocumentController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { AuthorityService } from '../../../../../../src/DomainServices/AuthorityService'
import {
  DocumentPermission,
  DocumentService,
} from '../../../../../../src/DomainServices/DocumentService'
import { DocumentClient } from '../../../../../../src/Models/RepositoryModels'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

let documentService: DocumentService
let authorityService: AuthorityService
let documentClient: DocumentClient
let documentController: DocumentController

beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  documentService = DIContainer.sharedContainer.documentService
  documentClient = DIContainer.sharedContainer.documentClient
  documentService = DIContainer.sharedContainer.documentService
  authorityService = DIContainer.sharedContainer.authorityService
  documentController = new DocumentController()
})
jest.setTimeout(TEST_TIMEOUT)

const mockDoc = {
  doc: {
    key1: 'value1',
    key2: 42,
    key3: ['item1', 'item2'],
    key4: { nestedKey: 'nestedValue' },
  },
}
const mockReceiveSteps = {
  steps: [],
  clientID: 123,
  version: 1,
}
const EMPTY_PERMISSIONS = new Set<DocumentPermission>()

const mockCreateDocRequest = {
  manuscript_model_id: 'random_manuscript_id',
  project_model_id: 'random_project_id',
  doc: mockDoc,
  schema_version: '0',
}

describe('DocumentController', () => {
  describe('createDocument', () => {
    it('should throw an error if no user is found', async () => {
      await expect(
        documentController.createDocument('projectID', mockCreateDocRequest, undefined)
      ).rejects.toThrow('No user found')
    })
    it('should call document.validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(documentService, 'validateUserAccess')
      documentClient.createDocument = jest.fn()
      await documentController.createDocument('projectID', mockCreateDocRequest, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentClient.createDocument', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.createDocument = jest.fn()
      const spy = jest.spyOn(documentClient, 'createDocument')
      await documentController.createDocument('projectID', mockCreateDocRequest, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentClient.createDocument with the correct arguments', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.createDocument = jest.fn()
      const spy = jest.spyOn(documentClient, 'createDocument')
      await documentController.createDocument('projectID', mockCreateDocRequest, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalledWith(mockCreateDocRequest, 'random_user_id')
    })
    it('should return the document', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.createDocument = jest.fn().mockReturnValue(mockCreateDocRequest.doc)
      const result = await documentController.createDocument('projectID', mockCreateDocRequest, {
        id: 'random_user_id',
      } as any)
      expect(result).toEqual(mockCreateDocRequest.doc)
    })
    it('should throw an error if the user does not have permission to write', async () => {
      documentService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([DocumentPermission.READ]))
      await expect(
        documentController.createDocument('projectID', mockCreateDocRequest, {
          id: 'random_user_id',
        } as any)
      ).rejects.toThrow('Access denied')
    })
  })
  describe('getDocument', () => {
    it('should throw an error if no user is found', async () => {
      await expect(
        documentController.getDocument('projectID', 'manuscriptID', undefined)
      ).rejects.toThrow('No user found')
    })
    it('should call document.validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(documentService, 'validateUserAccess')
      documentClient.findDocumentWithSnapshot = jest.fn().mockReturnValue({ data: {} })
      await documentController.getDocument('projectID', 'manuscriptID', {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentClient.findDocumentWithSnapshot', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.findDocumentWithSnapshot = jest.fn().mockResolvedValue({ data: {} })
      const spy = jest.spyOn(documentClient, 'findDocumentWithSnapshot')

      await documentController.getDocument('projectID', 'manuscriptID', {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentClient.findDocumentWithSnapshot with the correct arguments', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.findDocumentWithSnapshot = jest.fn().mockResolvedValue({ data: {} })
      const spy = jest.spyOn(documentClient, 'findDocumentWithSnapshot')
      await documentController.getDocument('projectID', 'manuscriptID', {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalledWith('manuscriptID')
    })
    it('should return the document', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.findDocumentWithSnapshot = jest.fn().mockReturnValue(mockCreateDocRequest.doc)

      const result = await documentController.getDocument('projectID', 'manuscriptID', {
        id: 'random_user_id',
      } as any)
      expect(result).toEqual(mockCreateDocRequest.doc)
    })
    it('should throw an error if the user does not have permission to read', async () => {
      documentService.getPermissions = jest.fn().mockResolvedValue(EMPTY_PERMISSIONS)
      await expect(
        documentController.getDocument('projectID', 'manuscriptID', {
          id: 'random_user_id',
        } as any)
      ).rejects.toThrow('Access denied')
    })
  })
  describe('deleteDocument', () => {
    it('should throw an error if no user is found', async () => {
      await expect(
        documentController.deleteDocument('projectID', 'manuscriptID', undefined)
      ).rejects.toThrow('No user found')
    })
    it('should call document.validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(documentService, 'validateUserAccess')
      documentClient.deleteDocument = jest.fn()

      await documentController.deleteDocument('projectID', 'manuscriptID', {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentClient.deleteDocument', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.deleteDocument = jest.fn()
      const spy = jest.spyOn(documentClient, 'deleteDocument')
      await documentController.deleteDocument('projectID', 'manuscriptID', {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentService.deleteDocument with the correct arguments', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.deleteDocument = jest.fn()
      const spy = jest.spyOn(documentClient, 'deleteDocument')
      await documentController.deleteDocument('projectID', 'manuscriptID', {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalledWith('manuscriptID')
    })
    it('should throw an error if the user does not have permission to write', async () => {
      documentService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([DocumentPermission.READ]))
      await expect(
        documentController.deleteDocument('projectID', 'manuscriptID', {
          id: 'random_user_id',
        } as any)
      ).rejects.toThrow('Access denied')
    })
  })
  describe('updateDocument', () => {
    it('should throw an error if no user is found', async () => {
      await expect(
        documentController.updateDocument(
          'projectID',
          'manuscriptID',
          mockCreateDocRequest,
          undefined
        )
      ).rejects.toThrow('No user found')
    })
    it('should call document.validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(documentService, 'validateUserAccess')
      documentClient.updateDocument = jest.fn()

      await documentController.updateDocument('projectID', 'manuscriptID', mockCreateDocRequest, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentClient.updateDocument', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.updateDocument = jest.fn()
      const spy = jest.spyOn(documentClient, 'updateDocument')
      await documentController.updateDocument('projectID', 'manuscriptID', mockDoc, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should documentClient documentService.updateDocument with the correct arguments', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.updateDocument = jest.fn()
      const spy = jest.spyOn(documentClient, 'updateDocument')
      await documentController.updateDocument('projectID', 'manuscriptID', mockDoc, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalledWith('manuscriptID', mockDoc)
    })
    it('should throw an error if the user does not have permission to write', async () => {
      documentService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([DocumentPermission.READ]))
      await expect(
        documentController.updateDocument('projectID', 'manuscriptID', mockDoc, {
          id: 'random_user_id',
        } as any)
      ).rejects.toThrow('Access denied')
    })
  })
  describe('receiveSteps', () => {
    it('should throw an error if no user is found', async () => {
      await expect(
        documentController.receiveSteps('projectID', 'manuscriptID', mockReceiveSteps, undefined)
      ).rejects.toThrow('No user found')
    })
    it('should call document.validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(documentService, 'validateUserAccess')
      authorityService.receiveSteps = jest.fn()
      await documentController.receiveSteps(
        'projectID',
        'manuscriptID',
        mockReceiveSteps,
        {} as any
      )
      expect(spy).toHaveBeenCalled()
    })
    it('should throw an error if the user does not have permission to write', async () => {
      documentService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([DocumentPermission.READ]))
      await expect(
        documentController.receiveSteps('projectID', 'manuscriptID', mockReceiveSteps, {} as any)
      ).rejects.toThrow('Access denied')
    })
  })
})
