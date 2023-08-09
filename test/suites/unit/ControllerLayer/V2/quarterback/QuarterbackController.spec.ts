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

import { QuarterbackController } from '../../../../../../src/Controller/V2/Quarterback/QuarterbackController'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { ProjectPermission } from '../../../../../../src/DomainServices/ProjectService'
import { ValidationError } from '../../../../../../src/Errors'
import { validManuscript } from '../../../../../data/fixtures/manuscripts'
import { validUser } from '../../../../../data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
})
afterEach(() => {
  jest.clearAllMocks()
})

describe('QuarterbackController', () => {
  let controller: QuarterbackController
  const doc = {
    manuscript_model_id: 'MPManuscript:id',
    project_model_id: 'MPProject:id',
    doc: { type: 'proseMirrorDoc' },
  }
  beforeEach(() => {
    controller = new QuarterbackController()
    DIContainer.sharedContainer.projectService.getPermissions = jest
      .fn()
      .mockResolvedValue(
        new Set([
          ProjectPermission.READ,
          ProjectPermission.CREATE_MANUSCRIPT,
          ProjectPermission.DELETE,
          ProjectPermission.UPDATE,
        ])
      )
  })
  describe('create Document', () => {
    it('should call quarterbackService.createDocument', async () => {
      const req: any = { params: { projectID: 'someId' }, user: validUser, body: doc }
      const quarterbackService = DIContainer.sharedContainer.quarterback
      quarterbackService.createDocument = jest.fn()
      await controller.createDocument(req)
      expect(quarterbackService.createDocument).toHaveBeenCalled()
    })
  })

  describe('get Document', () => {
    it('should call quarterbackService.getDocument', async () => {
      const req: any = { params: { projectID: 'someId', manuscriptID: 'someId' }, user: validUser }
      const quarterbackService = DIContainer.sharedContainer.quarterback
      quarterbackService.getDocument = jest.fn()
      await controller.getDocument(req)
      expect(quarterbackService.getDocument).toHaveBeenCalled()
    })
  })

  describe('delete Document', () => {
    it('should call quarterbackService.deleteDocument', async () => {
      const req: any = { params: { projectID: 'someId', manuscriptID: 'someId' }, user: validUser }
      const quarterbackService = DIContainer.sharedContainer.quarterback
      quarterbackService.deleteDocument = jest.fn()
      await controller.deleteDocument(req)
      expect(quarterbackService.deleteDocument).toHaveBeenCalled()
    })
  })

  describe('update Document', () => {
    it('should call quarterbackService.updateDocument', async () => {
      const req: any = {
        params: { projectID: 'someId', manuscriptID: 'someId' },
        user: validUser,
        body: doc,
      }
      const quarterbackService = DIContainer.sharedContainer.quarterback
      quarterbackService.updateDocument = jest.fn()
      await controller.updateDocument(req)
      expect(quarterbackService.updateDocument).toHaveBeenCalled()
    })
  })

  describe('createSnapshot', () => {
    it('should call quarterbackService.createSnapshot', async () => {
      const req: any = { params: { projectID: 'someId' }, user: validUser, body: doc }
      const quarterbackService = DIContainer.sharedContainer.quarterback
      quarterbackService.createSnapshot = jest.fn()
      await controller.createSnapshot(req)
      expect(quarterbackService.createSnapshot).toHaveBeenCalled()
    })
  })

  describe('getSnapshotLabels', () => {
    it('should call quarterbackService.getSnapshotLabels', async () => {
      const req: any = {
        params: { projectID: 'someId', manuscriptID: 'someId' },
        user: validUser,
        body: doc,
      }
      const quarterbackService = DIContainer.sharedContainer.quarterback
      quarterbackService.getSnapshotLabels = jest.fn()
      await controller.getSnapshotLabels(req)
      expect(quarterbackService.getSnapshotLabels).toHaveBeenCalled()
    })
  })

  describe('deleteSnapshot', () => {
    it('should call quarterbackService.deleteSnapshot', async () => {
      const req: any = {
        params: { snapshotID: 'someId' },
        user: validUser,
      }
      const quarterbackService = DIContainer.sharedContainer.quarterback
      quarterbackService.getSnapshotLabels = jest.fn()
      quarterbackService.getSnapshot = jest
        .fn()
        .mockResolvedValue({ doc_id: 'doc_id', id: 'id', snapshot: doc })
      DIContainer.sharedContainer.manuscriptRepository.getById = jest
        .fn()
        .mockResolvedValue(validManuscript)
      await controller.getSnapshotLabels(req)
      expect(quarterbackService.getSnapshotLabels).toHaveBeenCalled()
    })
  })

  describe('getSnapshot', () => {
    it('should call quarterbackService.getSnapshot', async () => {
      const req: any = {
        params: { snapshotID: 'someId' },
        user: validUser,
      }
      const quarterbackService = DIContainer.sharedContainer.quarterback
      quarterbackService.getSnapshot = jest
        .fn()
        .mockResolvedValue(JSON.stringify({ doc_id: 'doc_id', id: 'id', snapshot: doc }))
      DIContainer.sharedContainer.manuscriptRepository.getById = jest
        .fn()
        .mockResolvedValue(validManuscript)
      await controller.getSnapshot(req)
      expect(quarterbackService.getSnapshot).toHaveBeenCalled()
    })
    it('should fail quarterbackService.getSnapshot if snapshot not found', async () => {
      const req: any = {
        params: { snapshotID: 'someId' },
        user: validUser,
      }
      const quarterbackService = DIContainer.sharedContainer.quarterback
      quarterbackService.getSnapshot = jest.fn().mockResolvedValue(undefined)
      DIContainer.sharedContainer.manuscriptRepository.getById = jest
        .fn()
        .mockResolvedValue(validManuscript)
      await expect(controller.getSnapshot(req)).rejects.toThrow(ValidationError)
    })
    it('should fail quarterbackService.getSnapshot if manuscript not found', async () => {
      const req: any = {
        params: { snapshotID: 'someId' },
        user: validUser,
      }
      const quarterbackService = DIContainer.sharedContainer.quarterback
      quarterbackService.getSnapshot = jest
        .fn()
        .mockResolvedValue(JSON.stringify({ doc_id: 'doc_id', id: 'id', snapshot: doc }))
      DIContainer.sharedContainer.manuscriptRepository.getById = jest
        .fn()
        .mockResolvedValue(undefined)
      await expect(controller.getSnapshot(req)).rejects.toThrow(ValidationError)
    })
  })
})
