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

import { SnapshotController } from '../../../../../../src/Controller/V2/Snapshot/SnapshotController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  DocumentPermission,
  DocumentService,
} from '../../../../../../src/DomainServices/DocumentService'
import { MissingSnapshotError, ValidationError } from '../../../../../../src/Errors'
import { DocumentClient, SnapshotClient } from '../../../../../../src/Models/RepositoryModels'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
jest.setTimeout(TEST_TIMEOUT)

let snapshotClient: SnapshotClient
let documentService: DocumentService
let documentClient: DocumentClient

const EMPTY_PERMISSIONS = new Set<DocumentPermission>()

const mockDoc = {
  doc: {
    key1: 'value1',
    key2: 42,
    key3: ['item1', 'item2'],
    key4: { nestedKey: 'nestedValue' },
  },
}
const mockSnapshot = {
  id: 'random_snapshot_id',
  name: 'random_snapshot_name',
  snapshot: {
    id: 'random_snapshot_id',
    doc_id: 'random_doc_id',
    doc: {
      id: 'random_doc_id',
      container_id: 'random_container_id',
      container: {
        id: 'random_container_id',
        project_id: 'random_project_id',
      },
    },
  },
  doc_id: 'random_doc_id',
}
const mockSnapshotLabel = {
  id: 'random_snapshot_id',
  name: 'random_snapshot_name',
  createdAt: '2023-11-21T18:41:06.164Z',
}
beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  snapshotClient = DIContainer.sharedContainer.snapshotClient
  documentService = DIContainer.sharedContainer.documentService
  documentClient = DIContainer.sharedContainer.documentClient
})
afterEach(() => {
  jest.clearAllMocks()
})

describe('SnapshotController', () => {
  let snapshotController: SnapshotController
  beforeEach(() => {
    snapshotController = new SnapshotController()
  })
  describe('listSnapshotLabels', () => {
    it('should throw an error if no user is found', async () => {
      await expect(
        snapshotController.listSnapshotLabels('projectID', 'manuscriptID', undefined)
      ).rejects.toThrow('No user found')
    })
    it('should call document.validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(documentService, 'validateUserAccess')
      snapshotClient.listSnapshotLabels = jest.fn()
      await snapshotController.listSnapshotLabels('projectID', 'manuscriptID', {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call snapshotService.listSnapshotLabels', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      snapshotClient.listSnapshotLabels = jest.fn()
      const spy = jest.spyOn(snapshotClient, 'listSnapshotLabels')
      await snapshotController.listSnapshotLabels('projectID', 'manuscriptID', {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should throw an error if the user does not have read access', async () => {
      documentService.getPermissions = jest.fn().mockResolvedValue(EMPTY_PERMISSIONS)
      await expect(
        snapshotController.listSnapshotLabels('projectID', 'manuscriptID', {
          id: 'random_user_id',
        } as any)
      ).rejects.toThrow('Access denied')
    })
    it('should return the result of snapshotService.listSnapshotLabels', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      snapshotClient.listSnapshotLabels = jest
        .fn()
        .mockReturnValue(Promise.resolve(mockSnapshotLabel))
      const result = await snapshotController.listSnapshotLabels('projectID', 'manuscriptID', {
        id: 'random_user_id',
      } as any)
      expect(result).toBe(mockSnapshotLabel)
    })
  })
  describe('getSnapshot', () => {
    it('should throw an error if no user is found', async () => {
      await expect(snapshotController.getSnapshot('snapshotID', undefined)).rejects.toThrow(
        'No user found'
      )
    })
    it('should call document.validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(documentService, 'validateUserAccess')
      snapshotClient.getSnapshot = jest.fn()
      snapshotController['fetchSnapshot'] = jest.fn().mockReturnValue(Promise.resolve(mockSnapshot))
      documentService.getManuscriptFromSnapshot = jest
        .fn()
        .mockResolvedValue({ random: 'manuscript' })
      await snapshotController.getSnapshot('snapshotID', { id: 'random_user_id' } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call snapshotService.getSnapshot', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      snapshotController['fetchSnapshot'] = jest.fn().mockReturnValue(Promise.resolve(mockSnapshot))
      snapshotClient.getSnapshot = jest.fn()

      documentService.getManuscriptFromSnapshot = jest
        .fn()
        .mockResolvedValue({ random: 'manuscript' })
      const spy = jest.spyOn(snapshotClient, 'getSnapshot')
      await snapshotController.getSnapshot('snapshotID', { id: 'random_user_id' } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should throw an error if the user does not have read access', async () => {
      snapshotController['fetchSnapshot'] = jest.fn().mockReturnValue(Promise.resolve(mockSnapshot))
      documentService.getManuscriptFromSnapshot = jest
        .fn()
        .mockResolvedValue({ random: 'manuscript' })
      documentService.getPermissions = jest.fn().mockResolvedValue(EMPTY_PERMISSIONS)
      await expect(
        snapshotController.getSnapshot('snapshotID', { id: 'random_user_id' } as any)
      ).rejects.toThrow('Access denied')
    })
    it('should return the result of snapshotService.getSnapshot', async () => {
      snapshotController['fetchSnapshot'] = jest.fn().mockReturnValue(Promise.resolve(mockSnapshot))
      documentService.getManuscriptFromSnapshot = jest
        .fn()
        .mockResolvedValue({ random: 'manuscript' })
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      snapshotClient.getSnapshot = jest.fn().mockReturnValue(Promise.resolve(mockSnapshot))
      const result = await snapshotController.getSnapshot('snapshotID', {
        id: 'random_user_id',
      } as any)
      expect(result).toBe(mockSnapshot)
    })
    it('should throw an error if the manuscript is not found', async () => {
      snapshotController['fetchSnapshot'] = jest.fn().mockReturnValue(Promise.resolve(null))
      documentService.getManuscriptFromSnapshot = jest
        .fn()
        .mockRejectedValue(new ValidationError('Manuscript not found', 'random_manuscript_id'))
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      await expect(
        snapshotController.getSnapshot('snapshotID', { id: 'random_user_id' } as any)
      ).rejects.toThrow('Validation error: Manuscript not found')
    })
    it('should throw an error if the snapshot is not found', async () => {
      snapshotClient.getSnapshot = jest
        .fn()
        .mockRejectedValue(new MissingSnapshotError('snapshotID'))
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      await expect(
        snapshotController.getSnapshot('snapshotID', { id: 'random_user_id' } as any)
      ).rejects.toThrow(new MissingSnapshotError('snapshotID'))
    })
  })
  describe('deleteSnapshot', () => {
    it('should throw an error if no user is found', async () => {
      await expect(snapshotController.deleteSnapshot('snapshotID', undefined)).rejects.toThrow(
        'No user found'
      )
    })
    it('should call document.validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(documentService, 'validateUserAccess')
      snapshotClient.deleteSnapshot = jest.fn()
      snapshotController['fetchSnapshot'] = jest.fn().mockReturnValue(Promise.resolve(mockSnapshot))
      documentService.getManuscriptFromSnapshot = jest
        .fn()
        .mockResolvedValue({ random: 'manuscript' })
      await snapshotController.deleteSnapshot('snapshotID', { id: 'random_user_id' } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call snapshotService.deleteSnapshot', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      snapshotController['fetchSnapshot'] = jest.fn().mockReturnValue(Promise.resolve(mockSnapshot))
      documentService.getManuscriptFromSnapshot = jest
        .fn()
        .mockResolvedValue({ random: 'manuscript' })
      snapshotClient.deleteSnapshot = jest.fn()
      const spy = jest.spyOn(snapshotClient, 'deleteSnapshot')
      await snapshotController.deleteSnapshot('snapshotID', { id: 'random_user_id' } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should throw an error if the user does not have write access', async () => {
      snapshotController['fetchSnapshot'] = jest.fn().mockReturnValue(Promise.resolve(mockSnapshot))
      documentService.getManuscriptFromSnapshot = jest
        .fn()
        .mockResolvedValue({ random: 'manuscript' })
      documentService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([DocumentPermission.READ]))
      await expect(
        snapshotController.deleteSnapshot('snapshotID', { id: 'random_user_id' } as any)
      ).rejects.toThrow('Access denied')
    })
    it('should return the result of snapshotService.deleteSnapshot', async () => {
      snapshotController['fetchSnapshot'] = jest.fn().mockReturnValue(Promise.resolve(mockSnapshot))
      documentService.getManuscriptFromSnapshot = jest
        .fn()
        .mockResolvedValue({ random: 'manuscript' })
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      snapshotClient.deleteSnapshot = jest.fn().mockReturnValue(Promise.resolve(mockSnapshot))
      const result = await snapshotController.deleteSnapshot('snapshotID', {
        id: 'random_user_id',
      } as any)
      expect(result).toBe(mockSnapshot)
    })
    it('should throw an error if the manuscript is not found', async () => {
      snapshotController['fetchSnapshot'] = jest.fn().mockReturnValue(Promise.resolve(null))
      documentService.getManuscriptFromSnapshot = jest
        .fn()
        .mockRejectedValue(new ValidationError('Manuscript not found', 'random_manuscript_id'))
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      await expect(
        snapshotController.deleteSnapshot('snapshotID', { id: 'random_user_id' } as any)
      ).rejects.toThrow('Validation error: Manuscript not found')
    })
    it('should throw an error if the snapshot is not found', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      snapshotClient.getSnapshot = jest
        .fn()
        .mockRejectedValue(new MissingSnapshotError('snapshotID'))
      await expect(
        snapshotController.deleteSnapshot('snapshotID', { id: 'random_user_id' } as any)
      ).rejects.toThrow(new MissingSnapshotError('snapshotID'))
    })
  })
  describe('createSnapshot', () => {
    it('should throw an error if no user is found', async () => {
      await expect(
        snapshotController.createSnapshot('projectID', { docID: 'docID', name: 'name' }, undefined)
      ).rejects.toThrow('No user found')
    })
    it('should call document.validateUserAccess', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      const spy = jest.spyOn(documentService, 'validateUserAccess')
      documentClient.findDocumentWithSnapshot = jest.fn().mockResolvedValue({ data: mockDoc })
      documentClient.updateDocument = jest.fn()
      snapshotClient.saveSnapshot = jest.fn()
      await snapshotController.createSnapshot('projectID', { docID: 'docID', name: 'name' }, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call documentClient.findDocumentWithSnapshot', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.findDocumentWithSnapshot = jest.fn().mockResolvedValue({ data: mockDoc })
      documentClient.updateDocument = jest.fn()

      const spy = jest.spyOn(documentClient, 'findDocumentWithSnapshot')
      snapshotClient.saveSnapshot = jest.fn()
      await snapshotController.createSnapshot('projectID', { docID: 'docID', name: 'name' }, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should call snapshotService.saveSnapshot', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.findDocumentWithSnapshot = jest.fn().mockResolvedValue({ data: mockDoc })
      snapshotClient.saveSnapshot = jest.fn()
      documentClient.updateDocument = jest.fn()

      const spy = jest.spyOn(snapshotClient, 'saveSnapshot')
      await snapshotController.createSnapshot('projectID', { docID: 'docID', name: 'name' }, {
        id: 'random_user_id',
      } as any)
      expect(spy).toHaveBeenCalled()
    })
    it('should throw an error if the user does not have write access', async () => {
      documentService.getPermissions = jest
        .fn()
        .mockResolvedValue(new Set([DocumentPermission.READ]))
      await expect(
        snapshotController.createSnapshot('projectID', { docID: 'docID', name: 'name' }, {
          id: 'random_user_id',
        } as any)
      ).rejects.toThrow('Access denied')
    })
    it('should return the result of snapshotService.saveSnapshot', async () => {
      documentService.validateUserAccess = jest.fn().mockReturnValue(Promise.resolve())
      documentClient.findDocumentWithSnapshot = jest.fn().mockResolvedValue({ data: mockDoc })
      documentClient.updateDocument = jest.fn()
      snapshotClient.saveSnapshot = jest.fn().mockResolvedValue(mockSnapshot)
      const result = await snapshotController.createSnapshot(
        'projectID',
        { docID: 'docID', name: 'name' },
        {
          id: 'random_user_id',
        } as any
      )
      expect(result).toBe(mockSnapshot)
    })
  })
  describe('fetchSnapshot', () => {
    it('should call snapshotService.getSnapshot', async () => {
      snapshotClient.getSnapshot = jest.fn().mockResolvedValue({ data: mockSnapshot })
      await snapshotController['fetchSnapshot']('random_snapshot_id')
      expect(snapshotClient.getSnapshot).toHaveBeenCalled()
    })
    it('should return the result of snapshotService.getSnapshot', async () => {
      snapshotClient.getSnapshot = jest.fn().mockResolvedValue(mockSnapshot)
      const result = await snapshotController['fetchSnapshot']('random_snapshot_id')
      expect(result).toStrictEqual(mockSnapshot)
    })
    it('should throw an error if the snapshot is not found', async () => {
      snapshotClient.getSnapshot = jest
        .fn()
        .mockRejectedValue(new MissingSnapshotError('random_snapshot_id'))
      await expect(snapshotController['fetchSnapshot']('random_snapshot_id')).rejects.toThrow(
        new MissingSnapshotError('random_snapshot_id')
      )
    })
  })
})
