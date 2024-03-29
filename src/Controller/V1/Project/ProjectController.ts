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

import { manuscriptIDTypes, Model, UserProfile } from '@manuscripts/json-schema'
import decompress from 'decompress'
import { Request } from 'express'
import * as fs from 'fs'
import { remove } from 'fs-extra'
import getStream from 'get-stream'
import jwt from 'jsonwebtoken'
import { Readable } from 'stream'
import tempy from 'tempy'

import { DIContainer } from '../../../DIContainer/DIContainer'
import { ContainerService } from '../../../DomainServices/Container/ContainerService'
import { ProjectPermission } from '../../../DomainServices/ProjectService'
import {
  InvalidCredentialsError,
  MissingManuscriptError,
  MissingModelError,
  MissingTemplateError,
  RecordNotFoundError,
  RoleDoesNotPermitOperationError,
  ValidationError,
} from '../../../Errors'
import { Container } from '../../../Models/ContainerModels'
import { isLoginTokenPayload } from '../../../Utilities/JWT/LoginTokenPayload'
import { authorizationBearerToken, BaseController } from '../../BaseController'

export class ProjectController extends BaseController {
  async create(req: Request): Promise<Container> {
    const title = req.body.title

    const token = authorizationBearerToken(req)
    const payload = jwt.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const owners = [payload.userId]

    const { _id }: Container = await DIContainer.sharedContainer.containerService.createContainer(
      token,
      null
    )

    await DIContainer.sharedContainer.containerService.updateContainerTitleAndCollaborators(
      _id,
      title,
      owners,
      undefined,
      undefined
    )

    return DIContainer.sharedContainer.containerService.getContainer(_id)
  }

  async add(req: Request): Promise<Container> {
    const file = req.file
    const { projectId } = req.params
    const { manuscriptId, templateId } = req.body

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }

    const permissions = await this.getPermissions(projectId, req.user._id)
    if (!permissions.has(ProjectPermission.CREATE_MANUSCRIPT)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, req.user._id)
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

    const project = await DIContainer.sharedContainer.containerService.getContainer(projectId)
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

    const createdAt = Math.round(Date.now() / 1000)
    const docs = json.data
      .filter((model: Model) => model.objectType !== 'MPManuscript')
      .map((model: Model) => {
        const doc: any = {
          ...model,
          createdAt,
          updatedAt: createdAt,
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
      templateFound = await DIContainer.sharedContainer.configService.hasDocument(templateId)
    }

    if (!templateFound && templateId) {
      throw new MissingTemplateError(templateId)
    }

    manuscriptObject = {
      ...manuscriptObject,
      createdAt,
      updatedAt: createdAt,
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
    await DIContainer.sharedContainer.containerService.upsertProjectModels(docs)

    return manuscriptObject
  }

  async saveProject(req: Request): Promise<Container> {
    const { projectId } = req.params
    const { data } = req.body

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }

    const token = authorizationBearerToken(req)
    const payload = jwt.decode(token)
    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const permissions = await this.getPermissions(projectId, req.user._id)
    if (!permissions.has(ProjectPermission.UPDATE)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, req.user._id)
    }

    const project = await DIContainer.sharedContainer.containerService.getContainer(projectId)

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
    await DIContainer.sharedContainer.containerService.upsertProjectModels(data)

    return project
  }

  async projectReplace(req: Request): Promise<Model> {
    const { projectId, manuscriptId } = req.params
    const { data } = req.body

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }

    if (!manuscriptId) {
      throw new ValidationError('manuscriptsID parameter must be specified', manuscriptId)
    }

    const userId = ContainerService.userIdForSync(req.user._id)

    const permissions = await this.getPermissions(projectId, req.user._id)
    if (!permissions.has(ProjectPermission.UPDATE)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, req.user._id)
    }
    const manuscriptsObj = DIContainer.sharedContainer.manuscriptRepository.getById(
      manuscriptId,
      userId
    )
    if (!manuscriptsObj) {
      throw new MissingManuscriptError(manuscriptId)
    }

    // prevalidate models, so in the case of
    // validation errors we fail before removing resources
    const docs = await DIContainer.sharedContainer.containerService.processManuscriptModels(
      data,
      projectId,
      manuscriptId
    )

    await DIContainer.sharedContainer.projectRepository.removeAllResources(projectId)

    return await DIContainer.sharedContainer.projectRepository.bulkInsert(docs)
  }

  async userProfiles(req: Request): Promise<UserProfile[]> {
    const { projectId } = req.params

    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }

    const token = authorizationBearerToken(req)
    const payload = jwt.decode(token)
    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }
    const permissions = await this.getPermissions(projectId, payload.userId)
    if (!permissions.has(ProjectPermission.READ)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, payload.userId)
    }

    return await DIContainer.sharedContainer.userService.getProjectUserProfiles(projectId)
  }

  async deleteModel(req: Request): Promise<void> {
    const { projectId, manuscriptId, modelId } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

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
    const permissions = await this.getPermissions(projectId, req.user._id)
    if (!permissions.has(ProjectPermission.DELETE)) {
      throw new RoleDoesNotPermitOperationError(`Access denied`, req.user._id)
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

  async getPermissions(projectID: string, userID: string): Promise<ReadonlySet<ProjectPermission>> {
    return DIContainer.sharedContainer.projectService.getPermissions(projectID, userID)
  }
}
