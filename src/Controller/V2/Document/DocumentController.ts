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

import { Prisma } from '@prisma/client'

import { ProjectPermission } from '../../..//Models/ProjectModels'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { DocumentPermission } from '../../../DomainServices/DocumentService'
import { RoleDoesNotPermitOperationError, ValidationError } from '../../../Errors'
import { History, ReceiveSteps } from '../../../Models/AuthorityModels'
import { CreateDoc, UpdateDocument } from '../../../Models/DocumentModels'
import { encodeSnapshotID } from '../../../Utilities/CfWorker/SnapshotIdCodec'
import { resolveV3Route } from '../../../Utilities/CfWorker/routing'
import { BaseController } from '../../BaseController'

export class DocumentController extends BaseController {
  async createDocument(payload: CreateDoc, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user.id,
      payload.project_model_id,
      DocumentPermission.WRITE
    )
    return await DIContainer.sharedContainer.documentClient.createDocument(payload, user.id)
  }

  async getDocument(projectID: string, manuscriptID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const route = await resolveV3Route(projectID, manuscriptID)
    if (route.proxied) {
      const [document, snapshots] = await Promise.all([
        DIContainer.sharedContainer.cfWorkerClient.getDocument(user.connectUserID, route.docID),
        DIContainer.sharedContainer.cfWorkerClient.listSnapshots(user.connectUserID, route.docID),
      ])
      return {
        manuscript_model_id: manuscriptID,
        project_model_id: projectID,
        schema_version: route.schemaVersion,
        doc: document.doc,
        version: document.version,
        snapshots: snapshots.map((snapshot) => ({
          id: encodeSnapshotID(route.docID, snapshot.id),
          name: snapshot.name,
          createdAt: snapshot.createdAt,
        })),
      }
    }
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user.id,
      projectID,
      DocumentPermission.READ
    )
    return await DIContainer.sharedContainer.documentClient.findDocument(manuscriptID)
  }

  async deleteDocument(projectID: string, manuscriptID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const route = await resolveV3Route(projectID, manuscriptID)
    if (route.proxied) {
      return DIContainer.sharedContainer.cfWorkerClient.deleteDocument(
        user.connectUserID,
        route.docID
      )
    }
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user.id,
      projectID,
      DocumentPermission.WRITE
    )
    return DIContainer.sharedContainer.documentClient.deleteDocument(manuscriptID)
  }

  async updateDocument(
    projectID: string,
    manuscriptID: string,
    payload: UpdateDocument,
    user: Express.User | undefined
  ) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user.id,
      projectID,
      DocumentPermission.WRITE
    )
    return DIContainer.sharedContainer.documentClient.updateDocument(manuscriptID, payload)
  }

  async getEvents(
    projectID: string,
    manuscriptID: string,
    versionID: number,
    user: Express.User | undefined
  ): Promise<History> {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const route = await resolveV3Route(projectID, manuscriptID)
    if (route.proxied) {
      const result = await DIContainer.sharedContainer.cfWorkerClient.getStepsSince(
        user.connectUserID,
        route.docID,
        versionID
      )
      return {
        steps: result.steps as Prisma.JsonValue[],
        clientIDs: result.clientIDs,
        version: result.version,
      }
    }
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user.id,
      projectID,
      DocumentPermission.READ
    )
    return await DIContainer.sharedContainer.authorityService.getEvents(manuscriptID, versionID)
  }

  async receiveSteps(
    projectID: string,
    manuscriptID: string,
    payload: ReceiveSteps,
    user: Express.User | undefined
  ): Promise<History> {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const route = await resolveV3Route(projectID, manuscriptID)
    if (route.proxied) {
      const result = await DIContainer.sharedContainer.cfWorkerClient.receiveSteps(
        user.connectUserID,
        route.docID,
        payload.steps,
        payload.clientID,
        payload.version
      )
      return {
        steps: result.steps as Prisma.JsonValue[],
        clientIDs: result.clientIDs,
        version: result.version,
      }
    }
    await DIContainer.sharedContainer.documentService.validateUserAccess(
      user.id,
      projectID,
      DocumentPermission.WRITE
    )
    return await DIContainer.sharedContainer.authorityService.receiveSteps(manuscriptID, payload)
  }

  broadcastSteps(manuscriptID: string, result: History) {
    DIContainer.sharedContainer.socketsService.broadcast(manuscriptID, JSON.stringify(result))
  }

  async validateDocument(projectID: string, manuscriptID: string, user: Express.User | undefined) {
    if (!user) {
      throw new ValidationError('No user found', user)
    }
    const route = await resolveV3Route(projectID, manuscriptID)
    if (route.proxied) {
      return { isValid: true, errors: [] }
    }
    const permissions = await DIContainer.sharedContainer.projectService.getPermissions(
      projectID,
      user.id
    )
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, user.id)
    }
    return await DIContainer.sharedContainer.documentService.validateManuscript(manuscriptID)
  }
}
