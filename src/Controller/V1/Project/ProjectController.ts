/*!
 * © 2020 Atypon Systems LLC
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

import { Request } from 'express'

import { BaseController, authorizationBearerToken } from '../../BaseController'
import { IProjectController } from './IProjectController'
import { ContainerType, Container } from '../../../Models/ContainerModels'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { Readable } from 'stream'
import * as fs from 'fs'
import getStream from 'get-stream'
import decompress from 'decompress'
import {
  InvalidCredentialsError,
  MissingManuscriptError,
  MissingModelError,
  MissingTemplateError,
  RecordNotFoundError,
  RoleDoesNotPermitOperationError,
  ValidationError,
} from '../../../Errors'
import { manuscriptIDTypes, Model, UserCollaborator } from '@manuscripts/manuscripts-json-schema'
import { remove } from 'fs-extra'
import jsonwebtoken from 'jsonwebtoken'
import { ContainerService } from '../../../DomainServices/Container/ContainerService'
import { isLoginTokenPayload } from '../../../Utilities/JWT/LoginTokenPayload'
import { v4 as uuidv4 } from 'uuid'
import tempy from 'tempy'

export class ProjectController extends BaseController implements IProjectController {
  async create(req: Request): Promise<Container> {
    const title = req.body.title

    const token = authorizationBearerToken(req)
    const payload = jsonwebtoken.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const owners = [payload.userId]

    const { _id }: Container = await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].createContainer(token, null)

    await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].updateContainerTitleAndCollaborators(_id, title, owners, undefined, undefined)

    return DIContainer.sharedContainer.containerService[ContainerType.project].getContainer(_id)
  }

  async add(req: Request): Promise<Container> {
    const file = req.file
    const { projectId } = req.params
    const { manuscriptId, templateId } = req.body

    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }

    if (!file || !file.path) {
      throw new ValidationError('no file found, please upload a JATS XML file to import', projectId)
    }

    const token = authorizationBearerToken(req)
    const profile = await DIContainer.sharedContainer.userService.profile(token)
    if (!profile) {
      throw new ValidationError('Profile not found for token', profile)
    }

    const stream = fs.createReadStream(file.path)
    const manuscript: Readable = await DIContainer.sharedContainer.pressroomService.importJATS(
      stream
    )
    stream.close()

    const project = await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].getContainer(projectId)

    if (!ContainerService.isOwner(project, req.user._id)) {
      throw new RoleDoesNotPermitOperationError(
        'User must be an owner to add manuscripts.',
        req.user._id
      )
    }

    const unzipRoot = tempy.directory()
    const byPath = await this.extractFiles(manuscript, unzipRoot)

    // @ts-ignore
    if (!byPath || !byPath['index.manuscript-json']) {
      throw new ValidationError('JSON file not found', file.filename)
    }
    // @ts-ignore
    const json = JSON.parse(byPath['index.manuscript-json'].data)

    const container = await this.upsertManuscriptToProject(
      project,
      json,
      unzipRoot,
      req.user._id,
      manuscriptId,
      templateId
    )

    await remove(file.path)

    return container
  }

  async extractFiles(manuscript: Readable, unzipRoot: string) {
    const buffer = await getStream.buffer(manuscript)
    const files = await decompress(buffer, unzipRoot)
    return files.reduce((acc, v) => ({ ...acc, [v.path]: v }), {})
  }

  /**
   * Create/update the imported manuscript and it's resources.
   * @returns the created/updated manuscript
   */
  // tslint:disable-next-line:cyclomatic-complexity
  async upsertManuscriptToProject(
    project: Container,
    json: any,
    unzipRoot: string | null,
    userId: string,
    manuscriptId?: string,
    templateId?: string
  ): Promise<Container> {
    const userID = ContainerService.userIdForSync(userId)
    let manuscriptObject = json.data.find((model: Model) => model.objectType === 'MPManuscript')
    if (manuscriptId) {
      manuscriptObject._id = manuscriptId
    }

    const sessionID = uuidv4()
    const createdAt = Math.round(Date.now() / 1000)
    const docs = json.data
      .filter((model: Model) => model.objectType !== 'MPManuscript')
      .map((model: Model) => {
        const doc: any = {
          ...model,
          createdAt,
          updatedAt: createdAt,
          sessionID,
          containerID: project._id,
        }

        if (manuscriptIDTypes.has(doc.objectType)) {
          doc.manuscriptID = manuscriptObject._id
        }

        return doc
      })

    if (unzipRoot) {
      await remove(unzipRoot)
    }
    const template = templateId
      ? await DIContainer.sharedContainer.templateRepository.getById(templateId)
      : null

    let templateFound: boolean = templateId !== undefined && template !== null

    if (!templateFound && templateId) {
      templateFound = await DIContainer.sharedContainer.pressroomService.validateTemplateId(
        templateId
      )
    }

    if (!templateFound && templateId) {
      throw new MissingTemplateError(templateId)
    }

    manuscriptObject = {
      ...manuscriptObject,
      createdAt,
      updatedAt: createdAt,
      sessionID,
      containerID: project._id,
    }

    if (templateFound) {
      manuscriptObject['prototype'] = templateId
    }

    manuscriptId
      ? await DIContainer.sharedContainer.manuscriptRepository.patch(
          manuscriptObject._id,
          manuscriptObject,
          userID
        )
      : await DIContainer.sharedContainer.manuscriptRepository.create(manuscriptObject, userID)

    // call it without userId because access control has already happened
    await DIContainer.sharedContainer.containerService[ContainerType.project].upsertProjectModels(
      docs
    )

    return manuscriptObject
  }

  async saveProject(req: Request): Promise<Container> {
    const { projectId } = req.params
    const { data } = req.body

    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }

    const token = authorizationBearerToken(req)
    const payload = jsonwebtoken.decode(token)
    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const userId = ContainerService.userIdForSync(req.user._id)
    const project = await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].getContainer(projectId, userId)

    const manuscriptIdSet: Set<string> = new Set(
      data.map((doc: any) => {
        return doc.manuscriptID ? doc.manuscriptID : 'undefined'
      })
    )
    manuscriptIdSet.delete('undefined')
    if (manuscriptIdSet.size > 1) {
      throw new ValidationError(`contains multiple manuscriptIDs`, data)
    } else if (manuscriptIdSet.size === 1) {
      const [first] = manuscriptIdSet
      const manuscript = await DIContainer.sharedContainer.manuscriptRepository.getById(first)
      if (!manuscript) {
        throw new RecordNotFoundError(`referenced manuscript not found`)
      }
    }
    // call it without userId because access control has already happened
    await DIContainer.sharedContainer.containerService[ContainerType.project].upsertProjectModels(
      data
    )

    return project
  }

  async projectReplace(req: Request): Promise<Model> {
    const { projectId, manuscriptId } = req.params
    const { data } = req.body
    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }

    if (!manuscriptId) {
      throw new ValidationError('manuscriptsID parameter must be specified', manuscriptId)
    }

    const userId = ContainerService.userIdForSync(req.user._id)
    const canEdit = await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].checkIfCanEdit(userId, projectId)
    if (!canEdit) {
      throw new RoleDoesNotPermitOperationError(`permission denied`, userId)
    }

    const manuscriptsObj = DIContainer.sharedContainer.manuscriptRepository.getById(
      manuscriptId,
      userId
    )
    if (!manuscriptsObj) {
      throw new MissingManuscriptError(manuscriptId)
    }
    await DIContainer.sharedContainer.projectRepository.removeAllResources(manuscriptId)

    return await DIContainer.sharedContainer.containerService[ContainerType.project].bulkInsert(
      data,
      projectId,
      manuscriptId
    )
  }

  async collaborators(req: Request): Promise<UserCollaborator[]> {
    const { projectId } = req.params

    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }

    const token = authorizationBearerToken(req)
    const payload = jsonwebtoken.decode(token)
    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }
    const userId = ContainerService.userIdForSync(payload.userId)
    return await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].getCollaborators(projectId, userId)
  }

  async deleteModel(req: Request): Promise<void> {
    const { projectId, manuscriptId, modelId } = req.params
    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }

    if (!manuscriptId) {
      throw new ValidationError('manuscriptsID parameter must be specified', manuscriptId)
    }

    if (!modelId) {
      throw new ValidationError('modelID parameter must be specified', modelId)
    }

    const userId = ContainerService.userIdForSync(req.user._id)
    const canEdit = await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].checkIfCanEdit(userId, projectId)
    if (!canEdit) {
      throw new RoleDoesNotPermitOperationError(`permission denied`, userId)
    }

    const manuscriptsObj = DIContainer.sharedContainer.manuscriptRepository.getById(
      manuscriptId,
      userId
    )
    if (!manuscriptsObj) {
      throw new MissingManuscriptError(manuscriptId)
    }

    const modelExists = DIContainer.sharedContainer.projectRepository.resourceExists(
      projectId,
      modelId
    )
    if (!modelExists) {
      throw new MissingModelError(modelId)
    }

    return await DIContainer.sharedContainer.projectRepository.removeResource(modelId)
  }
}
