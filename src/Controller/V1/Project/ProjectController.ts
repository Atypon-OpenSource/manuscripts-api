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
import { Container, ContainerType } from '../../../Models/ContainerModels'
import { isString, validateParamsType, validateRequestParams } from '../../../util'
import { isLoginTokenPayload } from '../../../Utilities/JWT/LoginTokenPayload'
import { authorizationBearerToken, BaseController } from '../../BaseController'
import { getContainerType } from '../../ContainedBaseController'

export class ProjectController extends BaseController {
  async create(req: Request): Promise<Container> {
    const token = authorizationBearerToken(req)
    const containerType = req.params?.containerType
    if (!containerType) {
      const payload = jwt.decode(token)
      if (!isLoginTokenPayload(payload)) {
        throw new InvalidCredentialsError('Unexpected token payload.')
      }
      const title = req.body.title
      const owners = [payload.userId]

      const { _id }: Container = await DIContainer.sharedContainer.containerService[
        ContainerType.project
      ].createContainer(token, null)

      await DIContainer.sharedContainer.containerService[
        ContainerType.project
      ].updateContainerTitleAndCollaborators(_id, title, owners, undefined, undefined)

      return DIContainer.sharedContainer.containerService[ContainerType.project].getContainer(_id)
    }
    const _id = req.body._id
    if (!(containerType in ContainerType)) {
      throw new ValidationError('containerType should be valid', containerType)
    }

    if (_id && !isString(_id)) {
      throw new ValidationError('container id should be a string', _id)
    }
    return DIContainer.sharedContainer.containerService[containerType].createContainer(token, _id)
  }

  async add(req: Request): Promise<Container> {
    const file = req.file
    const { projectId } = req.params
    const { manuscriptId, templateId } = req.body

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    validateRequestParams(req, ['projectId'])

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
    validateRequestParams(req, ['projectId', 'manuscriptId'])
    await this.validateUserPermissions(req, projectId)
    await this.validateManuscriptExists(req, manuscriptId)
    // prevalidate models, so in the case of
    // validation errors we fail before removing resources
    const docs = await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].processManuscriptModels(data, projectId, manuscriptId)

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

    validateParamsType(['projectId', projectId, 'string'])

    if (manuscriptId && !isString(manuscriptId)) {
      throw new ValidationError('manuscriptId should be string', manuscriptId)
    }

    const containerType = getContainerType(projectId)

    const userID = req.user._id

    const project = await DIContainer.sharedContainer.containerService[containerType].getContainer(
      projectId,
      userID
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
      const data = await DIContainer.sharedContainer.containerService[containerType].loadProject(
        projectId,
        manuscriptId,
        {
          getAttachments: false,
          onlyIDs: false,
          allowOrphanedDocs: types && types.length > 0, // To make sure when document that are being asked they are not omitted even if they were not referenced
          includeExt: false,
          types,
        } as any
      )

      return { data, status: StatusCodes.OK }
    } catch (e) {
      throw new ManuscriptContentParsingError('Failed to make an archive.', e)
    }
  }

  async manageUserRole(req: Request): Promise<void> {
    const { managedUserId, managedUserConnectId, newRole, secret } = req.body
    const { containerID } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    if (
      !(managedUserId && isString(managedUserId)) &&
      !(managedUserConnectId && isString(managedUserConnectId))
    ) {
      throw new ValidationError('User id must be string', null)
    }

    if (!containerID || !isString(containerID)) {
      throw new ValidationError('container id must be string', containerID)
    }

    if (newRole !== null && !isString(newRole)) {
      throw new ValidationError('Role must be string or null', newRole)
    }

    if (secret && !isString(secret)) {
      throw new ValidationError('Secret must be string or undefined.', newRole)
    }

    const containerType = getContainerType(containerID)

    await DIContainer.sharedContainer.containerService[containerType].manageUserRole(
      req.user,
      containerID,
      { userId: managedUserId, connectUserId: managedUserConnectId },
      newRole
    )
  }
  async addUser(req: Request): Promise<void> {
    const { userId, role } = req.body
    const { containerID } = req.params
    const { user: addingUser } = req

    if (!addingUser) {
      throw new ValidationError('No user found', addingUser)
    }

    if (!userId || !isString(userId)) {
      throw new ValidationError('User id must be string', userId)
    }

    if (!containerID || !isString(containerID)) {
      throw new ValidationError('container id must be string', containerID)
    }

    if (role !== null && !isString(role)) {
      throw new ValidationError('Role must be string or null', role)
    }

    const containerType = getContainerType(containerID)

    await DIContainer.sharedContainer.containerService[containerType].addContainerUser(
      containerID,
      role,
      userId,
      addingUser
    )
  }

  async createManuscript(req: Request) {
    const { containerID, manuscriptID } = req.params
    const { user } = req
    const { templateId } = req.body

    if (!user) {
      throw new ValidationError('No user found', user)
    }

    validateParamsType(['containerID', containerID, 'string'])

    if (manuscriptID && !isString(manuscriptID)) {
      throw new ValidationError('manuscriptID should be string', manuscriptID)
    }

    if (templateId && !isString(templateId)) {
      throw new ValidationError('templateId should be string', templateId)
    }

    const containerType = getContainerType(containerID)
    return DIContainer.sharedContainer.containerService[containerType].createManuscript(
      user._id,
      containerID,
      manuscriptID,
      templateId
    )
  }

  async addProductionNote(req: Request) {
    const { containerID, manuscriptID } = req.params
    const { content, target, connectUserID, source } = req.body
    validateParamsType(
      ['containerID', containerID, 'string'],
      ['manuscriptID', manuscriptID, 'string'],
      ['userConnectID', connectUserID, 'string'],
      ['content', content, 'string']
    )

    // if (!isString(content)) {
    //   throw new ValidationError('content should be string', manuscriptID)
    // }

    const containerType = getContainerType(containerID)
    return DIContainer.sharedContainer.containerService[containerType].createManuscriptNote(
      containerID,
      manuscriptID,
      content,
      connectUserID,
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
    return await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].getCollaborators(projectId, userId)
  }

  async getArchive(req: Request) {
    const { containerID, manuscriptID } = req.params
    const { onlyIDs } = req.query
    const { accept: acceptHeader } = req.headers

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    validateParamsType(['containerID', containerID, 'string'])

    const token = authorizationBearerToken(req)

    const getAttachments = acceptHeader !== 'application/json'
    const containerType = getContainerType(containerID)

    const userID = req.user._id
    try {
      return DIContainer.sharedContainer.containerService[containerType].getArchive(
        userID,
        containerID,
        manuscriptID,
        token,
        {
          getAttachments,
          onlyIDs: onlyIDs === 'true',
          allowOrphanedDocs: true,
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

    validateParamsType(['containerID', id, 'string'])

    return DIContainer.sharedContainer.containerService[ContainerType.project].getAttachment(
      req.user._id,
      id,
      req.params.attachmentKey
    )
  }

  jwksForAccessScope(req: Request): { keys: [RSA_JWK] } {
    const { scope, containerType } = req.params
    validateParamsType(['containerType', containerType, 'string'])
    validateParamsType(['scope', scope, 'string'])

    const s = ContainerService.findScope(scope, config.scopes)
    if (s.publicKeyJWK === null) {
      throw new ValidationError('scope does not have a public key', s.publicKeyJWK)
    }
    const jwk: any = Object.assign({}, s.publicKeyJWK)
    jwk.kid = s.identifier // see https://tools.ietf.org/html/rfc7517#section-4.5 re: 'kid'
    return { keys: [jwk] }
  }

  async getBundle(req: Request, finish: CallableFunction) {
    const { containerID, manuscriptID } = req.params
    const { onlyIDs } = req.query

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    validateParamsType(['containerID', containerID, 'string'])
    const containerType = getContainerType(containerID)

    // will fail of the user is not a collaborator on the project
    const canAccess = await DIContainer.sharedContainer.containerService[
      containerType
    ].checkUserContainerAccess(req.user._id, containerID)

    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerID)
    }

    validateParamsType(['manuscriptID', manuscriptID, 'string'])

    const token = authorizationBearerToken(req)

    const getAttachments = true
    const includeExt = false
    const allowOrphanedDocs = false
    const userID = req.user._id
    const archive = await DIContainer.sharedContainer.containerService[containerType].getArchive(
      userID,
      containerID,
      null,
      token,
      {
        getAttachments,
        onlyIDs: onlyIDs === 'true',
        allowOrphanedDocs,
        includeExt,
      }
    )

    if (!archive) {
      throw new IllegalStateError('', archive)
    }

    await DIContainer.sharedContainer.pressroomService
      .fetchHtml(archive, manuscriptID)
      .then((result) => finish(result))
      .catch((reason) => {
        throw new IllegalStateError('Failed to fetch html bundle.', reason)
      })
  }

  async accessToken(req: Request): Promise<any> {
    const { containerID, scope } = req.params
    const user = req.user

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    validateParamsType(['containerID', containerID, 'string'], ['manuscriptID', scope, 'string'])
    const containerType = getContainerType(containerID)
    return DIContainer.sharedContainer.containerService[containerType].accessToken(
      user._id,
      scope,
      containerID
    )
  }

  async getProductionNotes(req: Request) {
    const { containerID, manuscriptID } = req.params
    validateParamsType(
      ['containerID', containerID, 'string'],
      ['manuscriptID', manuscriptID, 'string']
    )
    const containerType = getContainerType(containerID)
    return DIContainer.sharedContainer.containerService[containerType].getProductionNotes(
      containerID,
      manuscriptID
    )
  }
  async deleteModel(req: Request): Promise<void> {
    const { projectId, manuscriptId, modelId } = req.params
    validateRequestParams(req, ['projectId', 'manuscriptId', 'modelId'])
    await this.validateUserPermissions(req, projectId)
    await this.validateManuscriptExists(req, manuscriptId)
    await this.validateModelExists(projectId, modelId)
    return await DIContainer.sharedContainer.projectRepository.removeResource(modelId)
  }
  async delete(req: Request): Promise<void> {
    const { containerID } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    if (!containerID || !isString(containerID)) {
      throw new ValidationError('container id should be a string', containerID)
    }

    const containerType = getContainerType(containerID)

    await DIContainer.sharedContainer.containerService[containerType].deleteContainer(
      containerID,
      req.user
    )
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

  async validateUserPermissions(req: Request, projectId: string) {
    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    const userId = ContainerService.userIdForSync(req.user._id)
    const canEdit = await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].checkIfCanEdit(userId, projectId)
    if (!canEdit) {
      throw new RoleDoesNotPermitOperationError(`permission denied`, userId)
    }
  }
  async validateManuscriptExists(req: Request, manuscriptId: string) {
    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    const userId = ContainerService.userIdForSync(req.user._id)
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
}
