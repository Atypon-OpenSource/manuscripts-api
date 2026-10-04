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

import { getVersion } from '@manuscripts/transform'

import { DocumentController } from '../../../../../../src/Controller/V2/Document/DocumentController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { AuthorityService } from '../../../../../../src/DomainServices/AuthorityService'
import {
  DocumentPermission,
  DocumentService,
} from '../../../../../../src/DomainServices/DocumentService'
import { DocumentClient } from '../../../../../../src/Models/RepositoryModels'
import { encodeSnapshotID } from '../../../../../../src/Utilities/CfWorker/SnapshotIdCodec'
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
  // Every method now calls resolveV3Route first, which calls
  // documentClient.findRoutingInfo — dbMock's documentClient is a bare
  // jest.fn() with no methods, so every pre-existing test below needs
  // this default (migratedToV3: false routes to the unchanged v2 path);
  // tests that need the migratedToV3 branch override it themselves.
  documentClient.findRoutingInfo = jest.fn().mockResolvedValue({ migratedToV3: false })
  // getDocument's non-proxied branch calls findDocument directly (after
  // validateUserAccess) to fetch the actual document — separate from the
  // routing check above.
  documentClient.findDocument = jest.fn().mockResolvedValue({})
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
        documentController.createDocument( mockCreateDocRequest, undefined)
      ).rejects.toThrow('No user found')
    })
    it('should call document.validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(documentService, 'validateUserAccess')
      documentClient.createDocument = jest.fn()
      await documentController.createDocument(mockCreateDocRequest, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentClient.createDocument', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.createDocument = jest.fn()
      const spy = jest.spyOn(documentClient, 'createDocument')
      await documentController.createDocument(mockCreateDocRequest, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentClient.createDocument with the correct arguments', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.createDocument = jest.fn()
      const spy = jest.spyOn(documentClient, 'createDocument')
      await documentController.createDocument(mockCreateDocRequest, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalledWith(mockCreateDocRequest, 'random_user_id')
    })
    it('should return the document', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.createDocument = jest.fn().mockReturnValue(mockCreateDocRequest.doc)
      const result = await documentController.createDocument( mockCreateDocRequest, {
        id: 'random_user_id',
      } as any)
      expect(result).toEqual(mockCreateDocRequest.doc)
    })
    it('should throw an error if the user does not have permission to write', async () => {
      documentService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([DocumentPermission.READ]))
      await expect(
        documentController.createDocument( mockCreateDocRequest, {
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

  describe('getDocument — v3 routing', () => {
    it('proxies a v3-sentinel manuscriptID without calling validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn()
      DIContainer.sharedContainer.cfWorkerClient.getDocument = jest
        .fn()
        .mockResolvedValue({ doc: { type: 'doc' }, version: 2 })
      DIContainer.sharedContainer.cfWorkerClient.listSnapshots = jest.fn().mockResolvedValue([])

      const result = await documentController.getDocument('raw-v3-doc-id', 'v3', {
        id: 'user-1',
        connectUserID: 'connect-1',
      } as any)

      expect(documentService.validateUserAccess).not.toHaveBeenCalled()
      expect(result).toEqual({
        manuscript_model_id: 'v3',
        project_model_id: 'raw-v3-doc-id',
        schema_version: getVersion(),
        doc: { type: 'doc' },
        version: 2,
        snapshots: [],
      })
    })

    it('proxies a migratedToV3 document and rewrites snapshot ids', async () => {
      documentClient.findRoutingInfo = jest
        .fn()
        .mockResolvedValue({ migratedToV3: true, schema_version: '1.0.0' })
      documentService.validateUserAccess = jest.fn()
      DIContainer.sharedContainer.cfWorkerClient.getDocument = jest
        .fn()
        .mockResolvedValue({ doc: { type: 'doc' }, version: 5 })
      DIContainer.sharedContainer.cfWorkerClient.listSnapshots = jest
        .fn()
        .mockResolvedValue([{ id: 'snap-1', name: 'v1', createdAt: 100 }])

      const result = await documentController.getDocument('project-1', 'manuscript-1', {
        id: 'user-1',
        connectUserID: 'connect-1',
      } as any)

      expect(documentService.validateUserAccess).not.toHaveBeenCalled()
      expect(result.snapshots).toEqual([
        {
          id: encodeSnapshotID('project-1#manuscript-1', 'snap-1'),
          name: 'v1',
          createdAt: 100,
        },
      ])
    })

    it('still calls validateUserAccess for a non-migrated document', async () => {
      documentClient.findRoutingInfo = jest.fn().mockResolvedValue({ migratedToV3: false })
      documentService.validateUserAccess = jest.fn().mockResolvedValue(undefined)

      await documentController.getDocument('project-1', 'manuscript-1', {
        id: 'user-1',
        connectUserID: 'connect-1',
      } as any)

      expect(documentService.validateUserAccess).toHaveBeenCalledWith(
        'user-1',
        'project-1',
        DocumentPermission.READ
      )
    })
  })

  describe('deleteDocument — v3 routing', () => {
    it('proxies deletion for a migratedToV3 document', async () => {
      documentClient.findRoutingInfo = jest.fn().mockResolvedValue({ migratedToV3: true })
      documentClient.deleteDocument = jest.fn()
      DIContainer.sharedContainer.cfWorkerClient.deleteDocument = jest
        .fn()
        .mockResolvedValue(undefined)

      await documentController.deleteDocument('project-1', 'manuscript-1', {
        id: 'user-1',
        connectUserID: 'connect-1',
      } as any)

      expect(DIContainer.sharedContainer.cfWorkerClient.deleteDocument).toHaveBeenCalledWith(
        'connect-1',
        'project-1#manuscript-1'
      )
      expect(documentClient.deleteDocument).not.toHaveBeenCalled()
    })
  })

  describe('receiveSteps — v3 routing', () => {
    it('proxies steps for a migratedToV3 document and strips the type field', async () => {
      documentClient.findRoutingInfo = jest.fn().mockResolvedValue({ migratedToV3: true })
      DIContainer.sharedContainer.cfWorkerClient.receiveSteps = jest.fn().mockResolvedValue({
        type: 'steps',
        steps: [{ a: 1 }],
        clientIDs: [7],
        version: 4,
      })

      const result = await documentController.receiveSteps(
        'project-1',
        'manuscript-1',
        { steps: [{ a: 1 }], clientID: 7, version: 3 },
        { id: 'user-1', connectUserID: 'connect-1' } as any
      )

      expect(DIContainer.sharedContainer.cfWorkerClient.receiveSteps).toHaveBeenCalledWith(
        'connect-1',
        'project-1#manuscript-1',
        [{ a: 1 }],
        7,
        3
      )
      expect(result).toEqual({ steps: [{ a: 1 }], clientIDs: [7], version: 4 })
    })
  })

  describe('getEvents — v3 routing', () => {
    it('proxies steps-since for a migratedToV3 document', async () => {
      documentClient.findRoutingInfo = jest.fn().mockResolvedValue({ migratedToV3: true })
      DIContainer.sharedContainer.cfWorkerClient.getStepsSince = jest
        .fn()
        .mockResolvedValue({ steps: [], clientIDs: [], version: 9 })

      const result = await documentController.getEvents('project-1', 'manuscript-1', 5, {
        id: 'user-1',
        connectUserID: 'connect-1',
      } as any)

      expect(DIContainer.sharedContainer.cfWorkerClient.getStepsSince).toHaveBeenCalledWith(
        'connect-1',
        'project-1#manuscript-1',
        5
      )
      expect(result).toEqual({ steps: [], clientIDs: [], version: 9 })
    })
  })

  describe('validateDocument — v3 routing', () => {
    it('returns a valid result without hitting projectService for a migratedToV3 document', async () => {
      documentClient.findRoutingInfo = jest.fn().mockResolvedValue({ migratedToV3: true })
      const projectServiceSpy = jest.spyOn(
        DIContainer.sharedContainer.projectService,
        'getPermissions'
      )

      const result = await documentController.validateDocument('project-1', 'manuscript-1', {
        id: 'user-1',
        connectUserID: 'connect-1',
      } as any)

      expect(result).toEqual({ isValid: true, errors: [] })
      expect(projectServiceSpy).not.toHaveBeenCalled()
    })
  })
})
