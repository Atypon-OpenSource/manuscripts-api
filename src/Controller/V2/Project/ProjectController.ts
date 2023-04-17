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

import { manuscriptIDTypes, Model, UserCollaborator } from '@manuscripts/json-schema'
import decompress from 'decompress'
import { Request } from 'express'
import fs from 'fs'
import { remove } from 'fs-extra'
import getStream from 'get-stream'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import { RSA_JWK } from 'pem-jwk'
import { Readable } from 'stream'
import tempy from 'tempy'
import { v4 as uuidv4 } from 'uuid'

import { config } from '../../../Config/Config'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { ContainerService } from '../../../DomainServices/Container/ContainerService'
import { ArchiveOptions } from '../../../DomainServices/Container/IContainerService'
import {
  IllegalStateError,
  InvalidCredentialsError,
  ManuscriptContentParsingError,
  MissingContainerError,
  MissingManuscriptError,
  MissingModelError,
  MissingTemplateError,
  RecordNotFoundError,
  RoleDoesNotPermitOperationError,
  ValidationError,
} from '../../../Errors'
import { Container } from '../../../Models/ContainerModels'
import {
  isString,
  validateParamsType,
  validateRequestOptionalParams,
  validateRequestParams,
} from '../../../util'
import { isLoginTokenPayload } from '../../../Utilities/JWT/LoginTokenPayload'
import { authorizationBearerToken, BaseController } from '../../BaseController'

export class ProjectController extends BaseController {
  async create(req: Request): Promise<Container> {
    const title = req.body.title
    const projectId = req.params && req.params.projectId ? req.params.projectId : null
    const token = authorizationBearerToken(req)
    const payload = jwt.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const owners = [payload.userId]

    const { _id }: Container = await DIContainer.sharedContainer.containerService.createContainer(
      token,
      projectId
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
    validateRequestParams(req, ['projectId'])
    if (!file?.path) {
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

  async saveProject(req: Request): Promise<Container> {
    const { projectId } = req.params
    const { data } = req.body

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    validateRequestParams(req, ['projectId'])

    const token = authorizationBearerToken(req)
    const payload = jwt.decode(token)
    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const userId = ContainerService.userIdForSync(req.user._id)
    const project = await DIContainer.sharedContainer.containerService.getContainer(
      projectId,
      userId
    )
    await this.validateManuscriptReferences(data)
    // call it without userId because access control has already happened
    await DIContainer.sharedContainer.containerService.upsertProjectModels(data)
    return project
  }
  async projectReplace(req: Request): Promise<Model> {
    const { projectId, manuscriptId } = req.params
    const { data } = req.body
    validateRequestParams(req, ['projectId', 'manuscriptId'])
    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    const userId = ContainerService.userIdForSync(req.user._id)

    await this.validateUserPermissions(userId, projectId)
    await this.validateManuscriptExists(userId, manuscriptId)
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

  async loadProject(req: Request) {
    const { projectId, manuscriptId } = req.params
    const { types } = req.body
    const modifiedSince = req.headers['if-modified-since']

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    validateRequestParams(req, ['projectId'])
    validateRequestOptionalParams([req.body.manuscriptId, 'manuscriptId'])

    const userId = req.user._id

    const project = await DIContainer.sharedContainer.containerService.getContainer(
      projectId,
      userId
    )
    if (!project) {
      throw new MissingContainerError(project)
    }
    try {
      if (modifiedSince && project) {
        const modifiedSinceDate = new Date(modifiedSince)
        if (modifiedSinceDate.getTime() / 1000 >= project.updatedAt) {
          return { data: null, status: StatusCodes.NOT_MODIFIED }
        }
      }
      const data = await DIContainer.sharedContainer.containerService.loadProject(
        projectId,
        manuscriptId,
        {
          getAttachments: false,
          onlyIDs: false,
          includeExt: false,
          types,
        } as ArchiveOptions
      )

      return { data, status: StatusCodes.OK }
    } catch (e) {
      throw new ManuscriptContentParsingError('Failed to make an archive.', e)
    }
  }

  async manageUserRole(req: Request): Promise<void> {
    const { managedUserId, managedUserConnectId, newRole, secret } = req.body
    const { containerId } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    validateRequestOptionalParams(
      [managedUserId, 'managedUserId'],
      [managedUserConnectId, 'managedUserConnectId'],
      [secret, 'secret']
    )
    validateRequestParams(req, ['containerId'])
    validateParamsType({ name: 'container id', value: containerId, type: 'string' })

    if (newRole !== null && !isString(newRole)) {
      throw new ValidationError('Role must be string or null', newRole)
    }

    await DIContainer.sharedContainer.containerService.manageUserRole(
      req.user,
      containerId,
      { userId: managedUserId, connectUserId: managedUserConnectId },
      newRole
    )
  }
  async addUser(req: Request): Promise<void> {
    const { userId, role } = req.body
    const { projectId } = req.params
    const { user: addingUser } = req

    if (!addingUser) {
      throw new ValidationError('No user found', addingUser)
    }

    if (!userId || !isString(userId)) {
      throw new ValidationError('User id must be string', userId)
    }

    validateRequestParams(req, ['projectId'])
    validateParamsType({ name: 'project id', value: projectId, type: 'string' })
    if (role !== null && !isString(role)) {
      throw new ValidationError('Role must be string or null', role)
    }

    await DIContainer.sharedContainer.containerService.addContainerUser(
      projectId,
      role,
      userId,
      addingUser
    )
  }

  async createManuscript(req: Request) {
    const { projectId, manuscriptId } = req.params
    const { user } = req
    const { templateId } = req.body

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    validateRequestParams(req, ['manuscriptId', 'projectId'])
    validateParamsType(
      { name: 'projectId', value: projectId, type: 'string' },
      { name: 'manuscriptId', value: manuscriptId, type: 'string' }
    )

    validateRequestOptionalParams([templateId, 'templateId'])

    return DIContainer.sharedContainer.containerService.createManuscript(
      user._id,
      projectId,
      manuscriptId,
      templateId
    )
  }

  async addProductionNote(req: Request) {
    const { projectId, manuscriptId } = req.params
    const { content, target, connectUserId, source } = req.body
    validateParamsType(
      { name: 'projectId', value: projectId, type: 'string' },
      { name: 'manuscriptId', value: manuscriptId, type: 'string' },
      { name: 'connectUserId', value: connectUserId, type: 'string' },
      { name: 'content', value: content, type: 'string' }
    )
    return DIContainer.sharedContainer.containerService.createManuscriptNote(
      projectId,
      manuscriptId,
      content,
      connectUserId,
      source,
      target
    )
  }

  async collaborators(req: Request): Promise<UserCollaborator[]> {
    const { projectId } = req.params

    validateRequestParams(req, ['projectId'])

    const token = authorizationBearerToken(req)
    const payload = jwt.decode(token)
    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }
    const userId = ContainerService.userIdForSync(payload.userId)
    return await DIContainer.sharedContainer.containerService.getCollaborators(projectId, userId)
  }
  /**
   * Get container archive.
   * @param req Request express request.
   */
  async getArchive(req: Request) {
    const { projectId, manuscriptId } = req.params
    const { onlyIDs } = req.query
    const { accept: acceptHeader } = req.headers

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    validateParamsType({ name: 'projectId', value: projectId, type: 'string' })
    validateRequestOptionalParams([projectId, 'projectId'])
    const token = authorizationBearerToken(req)

    const getAttachments = acceptHeader !== 'application/json'

    const userId = req.user._id
    try {
      return DIContainer.sharedContainer.containerService.getArchive(
        userId,
        projectId,
        manuscriptId,
        token,
        {
          getAttachments,
          onlyIDs: onlyIDs === 'true',
          includeExt: false,
        }
      )
    } catch (e) {
      throw new ManuscriptContentParsingError('Failed to make an archive.', e)
    }
  }

  async extractFiles(manuscript: Readable, unzipRoot: string) {
    const buffer = await getStream.buffer(manuscript)
    const files = await decompress(buffer, unzipRoot)
    return files.reduce((acc, v) => ({ ...acc, [v.path]: v }), {})
  }

  async getAttachment(req: Request) {
    const { id } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    validateParamsType({ name: 'id', value: id, type: 'string' })

    return DIContainer.sharedContainer.containerService.getAttachment(
      req.user._id,
      id,
      req.params.attachmentKey
    )
  }

  jwksForAccessScope(req: Request): { keys: [RSA_JWK] } {
    const { scope, containerType } = req.params
    validateParamsType(
      { name: 'containerType', value: containerType, type: 'string' },
      { name: 'scope', value: scope, type: 'string' }
    )

    const s = ContainerService.findScope(scope, config.scopes)
    if (s.publicKeyJWK === null) {
      throw new ValidationError('scope does not have a public key', s.publicKeyJWK)
    }
    const jwk: any = Object.assign({}, s.publicKeyJWK)
    jwk.kid = s.identifier // see https://tools.ietf.org/html/rfc7517#section-4.5 re: 'kid'
    return { keys: [jwk] }
  }

  async getBundle(req: Request, finish: CallableFunction) {
    const { containerId, manuscriptId } = req.params
    const { onlyIDs } = req.query

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    validateParamsType({ name: 'containerId', value: containerId, type: 'string' })
    // will fail of the user is not a collaborator on the project
    const canAccess = await DIContainer.sharedContainer.containerService.checkUserContainerAccess(
      req.user._id,
      containerId
    )

    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerId)
    }

    validateParamsType({ name: 'manuscriptId', value: manuscriptId, type: 'string' })
    const token = authorizationBearerToken(req)

    const getAttachments = true
    const includeExt = false
    const userId = req.user._id
    const archive = await DIContainer.sharedContainer.containerService.getArchive(
      userId,
      containerId,
      null,
      token,
      {
        getAttachments,
        onlyIDs: onlyIDs === 'true',
        includeExt,
      }
    )

    if (!archive) {
      throw new IllegalStateError('', archive)
    }

    await DIContainer.sharedContainer.pressroomService
      .fetchHtml(archive, manuscriptId)
      .then((result) => finish(result))
      .catch((reason) => {
        throw new IllegalStateError('Failed to fetch html bundle.', reason)
      })
  }

  async accessToken(req: Request): Promise<any> {
    const { containerId, scope } = req.params
    const user = req.user

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    validateParamsType(
      { name: 'containerId', value: containerId, type: 'string' },
      { name: 'scope', value: scope, type: 'string' }
    )
    return DIContainer.sharedContainer.containerService.accessToken(user._id, scope, containerId)
  }

  async getProductionNotes(req: Request) {
    const { projectId, manuscriptId } = req.params
    validateParamsType(
      { name: 'projectId', value: projectId, type: 'string' },
      { name: 'manuscriptId', value: manuscriptId, type: 'string' }
    )
    return DIContainer.sharedContainer.containerService.getProductionNotes(projectId, manuscriptId)
  }
  async deleteModel(req: Request): Promise<void> {
    const { projectId, manuscriptId, modelId } = req.params
    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    validateRequestParams(req, ['projectId', 'manuscriptId', 'modelId'])
    const userId = ContainerService.userIdForSync(req.user._id)
    await this.validateUserPermissions(userId, projectId)
    await this.validateManuscriptExists(userId, manuscriptId)
    await this.validateModelExists(projectId, modelId)
    return await DIContainer.sharedContainer.projectRepository.removeResource(modelId)
  }
  async delete(req: Request): Promise<void> {
    const { containerId } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    validateRequestParams(req, ['containerId'])
    validateParamsType({ name: 'container id', value: containerId, type: 'string' })

    await DIContainer.sharedContainer.containerService.deleteContainer(containerId, req.user)
  }

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

    const sessionId = uuidv4()
    const createdAt = Math.round(Date.now() / 1000)
    const docs = json.data
      .filter((model: Model) => model.objectType !== 'MPManuscript')
      .map((model: Model) => {
        const doc: any = {
          ...model,
          createdAt,
          updatedAt: createdAt,
          sessionId,
          containerId: project._id,
        }

        if (manuscriptIDTypes.has(doc.objectType)) {
          doc.manuscriptId = manuscriptObject._id
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
      sessionId,
      containerId: project._id,
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

  async validateUserPermissions(userId: string, projectId: string) {
    const canEdit = await DIContainer.sharedContainer.containerService.checkIfCanEdit(
      userId,
      projectId
    )
    if (!canEdit) {
      throw new RoleDoesNotPermitOperationError(`permission denied`, userId)
    }
  }
  async validateManuscriptExists(userId: string, manuscriptId: string) {
    const manuscriptsObj = DIContainer.sharedContainer.manuscriptRepository.getById(
      manuscriptId,
      userId
    )
    if (!manuscriptsObj) {
      throw new MissingManuscriptError(manuscriptId)
    }
  }
  async validateModelExists(projectId: string, modelId: string) {
    const modelExists = DIContainer.sharedContainer.projectRepository.resourceExists(
      projectId,
      modelId
    )
    if (!modelExists) {
      throw new MissingModelError(modelId)
    }
  }
  async validateManuscriptReferences(data: any[]): Promise<void> {
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
  }
}
