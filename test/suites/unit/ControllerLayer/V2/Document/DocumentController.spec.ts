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

import '../../../../../utilities/dbMock'
import '../../../../../utilities/configMock'

import { DocumentController } from '../../../../../../src/Controller/V2/Document/DocumentController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { Authority } from '../../../../../../src/DomainServices/Authority/Authority'
import { DocumentService } from '../../../../../../src/DomainServices/Document/DocumentService'
import {
  QuarterbackPermission,
  QuarterbackService,
} from '../../../../../../src/DomainServices/Quarterback/QuarterbackService'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
jest.setTimeout(TEST_TIMEOUT)

let documentService: DocumentService
let quarterbackService: QuarterbackService
let collaborationService: Authority
beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  documentService = DIContainer.sharedContainer.documentService
  quarterbackService = DIContainer.sharedContainer.quarterback
  collaborationService = DIContainer.sharedContainer.collaborationService
})
afterEach(() => {
  jest.clearAllMocks()
})

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
const EMPTY_PERMISSIONS = new Set<QuarterbackPermission>()

const mockCreateDocRequest = {
  manuscript_model_id: 'random_manuscript_id',
  project_model_id: 'random_project_id',
  doc: mockDoc,
}

describe('DocumentController', () => {
  let documentController: DocumentController
  beforeEach(() => {
    documentController = new DocumentController()
  })
  describe('createDocument', () => {
    it('should throw an error if no user is found', async () => {
      await expect(
        documentController.createDocument('projectID', mockCreateDocRequest, undefined)
      ).rejects.toThrow('No user found')
    })
    it('should call quarterback.validateUserAccess', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(quarterbackService, 'validateUserAccess')
      documentService.createDocument = jest.fn()
      await documentController.createDocument('projectID', mockCreateDocRequest, {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentService.createDocument', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.createDocument = jest.fn()
      const spy = jest.spyOn(documentService, 'createDocument')
      await documentController.createDocument('projectID', mockCreateDocRequest, {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentService.createDocument with the correct arguments', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.createDocument = jest.fn()
      const spy = jest.spyOn(documentService, 'createDocument')
      await documentController.createDocument('projectID', mockCreateDocRequest, {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalledWith(mockCreateDocRequest, 'random_user_id')
    })
    it('should return the document', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.createDocument = jest.fn().mockReturnValue(mockCreateDocRequest.doc)
      const result = await documentController.createDocument('projectID', mockCreateDocRequest, {
        _id: 'random_user_id',
      } as any)
      expect(result).toEqual(mockCreateDocRequest.doc)
    })
    it('should throw an error if the user does not have permission to write', async () => {
      quarterbackService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([QuarterbackPermission.READ]))
      await expect(
        documentController.createDocument('projectID', mockCreateDocRequest, {
          _id: 'random_user_id',
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
    it('should call quarterback.validateUserAccess', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(quarterbackService, 'validateUserAccess')
      documentService.findDocumentWithSnapshot = jest.fn().mockReturnValue({ data: {} })
      await documentController.getDocument('projectID', 'manuscriptID', {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentService.findDocumentWithSnapshot', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.findDocumentWithSnapshot = jest.fn().mockResolvedValue({ data: {} })
      const spy = jest.spyOn(documentService, 'findDocumentWithSnapshot')

      await documentController.getDocument('projectID', 'manuscriptID', {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentService.findDocumentWithSnapshot with the correct arguments', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.findDocumentWithSnapshot = jest.fn().mockResolvedValue({ data: {} })
      const spy = jest.spyOn(documentService, 'findDocumentWithSnapshot')
      await documentController.getDocument('projectID', 'manuscriptID', {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalledWith('manuscriptID')
    })
    it('should return the document', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.findDocumentWithSnapshot = jest.fn().mockReturnValue(mockCreateDocRequest.doc)

      const result = await documentController.getDocument('projectID', 'manuscriptID', {
        _id: 'random_user_id',
      } as any)
      expect(result).toEqual(mockCreateDocRequest.doc)
    })
    it('should throw an error if the user does not have permission to read', async () => {
      quarterbackService.getPermissions = jest.fn().mockResolvedValue(EMPTY_PERMISSIONS)
      await expect(
        documentController.getDocument('projectID', 'manuscriptID', {
          _id: 'random_user_id',
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
    it('should call quarterback.validateUserAccess', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(quarterbackService, 'validateUserAccess')
      documentService.deleteDocument = jest.fn()

      await documentController.deleteDocument('projectID', 'manuscriptID', {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentService.deleteDocument', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.deleteDocument = jest.fn()
      const spy = jest.spyOn(documentService, 'deleteDocument')
      await documentController.deleteDocument('projectID', 'manuscriptID', {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentService.deleteDocument with the correct arguments', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.deleteDocument = jest.fn()
      const spy = jest.spyOn(documentService, 'deleteDocument')
      await documentController.deleteDocument('projectID', 'manuscriptID', {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalledWith('manuscriptID')
    })
    it('should throw an error if the user does not have permission to write', async () => {
      quarterbackService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([QuarterbackPermission.READ]))
      await expect(
        documentController.deleteDocument('projectID', 'manuscriptID', {
          _id: 'random_user_id',
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
    it('should call quarterback.validateUserAccess', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(quarterbackService, 'validateUserAccess')
      documentService.updateDocument = jest.fn()

      await documentController.updateDocument('projectID', 'manuscriptID', mockCreateDocRequest, {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentService.updateDocument', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.updateDocument = jest.fn()
      const spy = jest.spyOn(documentService, 'updateDocument')
      await documentController.updateDocument('projectID', 'manuscriptID', mockDoc, {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentService.updateDocument with the correct arguments', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.updateDocument = jest.fn()
      const spy = jest.spyOn(documentService, 'updateDocument')
      await documentController.updateDocument('projectID', 'manuscriptID', mockDoc, {
        _id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalledWith('manuscriptID', mockDoc)
    })
    it('should throw an error if the user does not have permission to write', async () => {
      quarterbackService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([QuarterbackPermission.READ]))
      await expect(
        documentController.updateDocument('projectID', 'manuscriptID', mockDoc, {
          _id: 'random_user_id',
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
    it('should call quarterback.validateUserAccess', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(quarterbackService, 'validateUserAccess')
      collaborationService.receiveSteps = jest.fn()
      await documentController.receiveSteps(
        'projectID',
        'manuscriptID',
        mockReceiveSteps,
        {} as any
      )
      expect(spy).toHaveBeenCalled()
    })
    it('should throw an error if the user does not have permission to write', async () => {
      quarterbackService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([QuarterbackPermission.READ]))
      await expect(
        documentController.receiveSteps('projectID', 'manuscriptID', mockReceiveSteps, {} as any)
      ).rejects.toThrow('Access denied')
    })
  })
  describe('getDocumentHistory', () => {
    it('should throw an error if no user is found', async () => {
      await expect(
        documentController.getDocumentHistory('projectID', 'manuscriptID', undefined)
      ).rejects.toThrow('No user found')
    })
    it('should call quarterback.validateUserAccess', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentService.findDocument = jest.fn().mockResolvedValue({})
      collaborationService.getEvents = jest.fn().mockReturnValue({})
      const spy = jest.spyOn(quarterbackService, 'validateUserAccess')
      await documentController.getDocumentHistory('projectID', 'manuscriptID', {} as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should throw an error if the user does not have permission to read', async () => {
      quarterbackService.getPermissions = jest.fn().mockResolvedValue(EMPTY_PERMISSIONS)
      await expect(
        documentController.getDocumentHistory('projectID', 'manuscriptID', {} as any)
      ).rejects.toThrow('Access denied')
    })
  })
  describe('getStepsFromVersion', () => {
    it('should throw an error if no user is found', async () => {
      await expect(
        documentController.stepsSince('projectID', 'manuscriptID', '1', undefined)
      ).rejects.toThrow('No user found')
    })
    it('should call quarterback.validateUserAccess', async () => {
      quarterbackService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(quarterbackService, 'validateUserAccess')
      collaborationService.getEvents = jest.fn().mockReturnValue({ data: {} })
      await documentController.stepsSince('projectID', 'manuscriptID', '1', {} as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should throw an error if the user does not have permission to read', async () => {
      quarterbackService.getPermissions = jest.fn().mockResolvedValue(EMPTY_PERMISSIONS)
      await expect(
        documentController.stepsSince('projectID', 'manuscriptID', '1', {} as any)
      ).rejects.toThrow('Access denied')
    })
  })
})
