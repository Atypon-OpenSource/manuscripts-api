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
    const projectID = req.params && req.params.projectID ? req.params.projectID : null
    const token = authorizationBearerToken(req)
    const payload = jwt.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const owners = [payload.userId]

    const { _id }: Container = await DIContainer.sharedContainer.containerService.createContainer(
      token,
      projectID
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
    const { projectID } = req.params
    const { manuscriptID, templateID } = req.body

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    validateRequestParams(req, ['projectID'])
    if (!file?.path) {
      throw new ValidationError('no file found, please upload a JATS XML file to import', projectID)
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

    const project = await DIContainer.sharedContainer.containerService.getContainer(projectID)

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
      manuscriptID,
      templateID
    )

    await remove(file.path)

    return container
  }

  async saveProject(req: Request): Promise<Container> {
    const { projectID } = req.params
    const { data } = req.body

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    validateRequestParams(req, ['projectID'])

    const token = authorizationBearerToken(req)
    const payload = jwt.decode(token)
    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const userID = ContainerService.userIdForSync(req.user._id)
    const project = await DIContainer.sharedContainer.containerService.getContainer(
      projectID,
      userID
    )
    await this.validateManuscriptReferences(data)
    // call it without userID because access control has already happened
    await DIContainer.sharedContainer.containerService.upsertProjectModels(data)
    return project
  }
  async projectReplace(req: Request): Promise<Model> {
    const { projectID, manuscriptID } = req.params
    const { data } = req.body
    validateRequestParams(req, ['projectID', 'manuscriptID'])
    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    const userID = ContainerService.userIdForSync(req.user._id)

    await this.validateUserPermissions(userID, projectID)
    await this.validateManuscriptExists(userID, manuscriptID)
    // prevalidate models, so in the case of
    // validation errors we fail before removing resources
    const docs = await DIContainer.sharedContainer.containerService.processManuscriptModels(
      data,
      projectID,
      manuscriptID
    )

    await DIContainer.sharedContainer.projectRepository.removeAllResources(projectID)

    return await DIContainer.sharedContainer.projectRepository.bulkInsert(docs)
  }

  async loadProject(req: Request) {
    const { projectID, manuscriptID } = req.params
    const { types } = req.body
    const modifiedSince = req.headers['if-modified-since']

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    validateRequestParams(req, ['projectID'])
    validateRequestOptionalParams([req.body.manuscriptID, 'manuscriptID'])

    const userID = req.user._id

    const project = await DIContainer.sharedContainer.containerService.getContainer(
      projectID,
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
      const data = await DIContainer.sharedContainer.containerService.loadProject(
        projectID,
        manuscriptID,
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
    const { userID, role } = req.body
    const { projectID } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    validateRequestOptionalParams([userID, 'userID'])
    validateRequestParams(req, ['projectID'])
    validateParamsType({ name: 'project id', value: projectID, type: 'string' })

    if (role !== null && !isString(role)) {
      throw new ValidationError('Role must be string or null', role)
    }

    await DIContainer.sharedContainer.containerService.manageUserRole(
      req.user,
      projectID,
      { connectUserID: userID },
      role
    )
  }
  async addUser(req: Request): Promise<void> {
    const { userID, role } = req.body
    const { projectID } = req.params
    const { user: addingUser } = req

    if (!addingUser) {
      throw new ValidationError('No user found', addingUser)
    }

    if (!userID || !isString(userID)) {
      throw new ValidationError('User id must be string', userID)
    }

    validateRequestParams(req, ['projectID'])
    validateParamsType({ name: 'project id', value: projectID, type: 'string' })
    if (role !== null && !isString(role)) {
      throw new ValidationError('Role must be string or null', role)
    }

    await DIContainer.sharedContainer.containerService.addContainerUser(
      projectID,
      role,
      userID,
      addingUser
    )
  }

  async createManuscript(req: Request) {
    const { projectID, manuscriptID } = req.params
    const { user } = req
    const { templateID } = req.body

    if (!user) {
      throw new ValidationError('No user found', user)
    }
    validateRequestParams(req, ['projectID'])
    validateParamsType({ name: 'projectID', value: projectID, type: 'string' })

    validateRequestOptionalParams([templateID, 'templateID'], [manuscriptID, 'manuscriptID'])

    return DIContainer.sharedContainer.containerService.createManuscript(
      user._id,
      projectID,
      manuscriptID,
      templateID
    )
  }

  async addProductionNote(req: Request) {
    const { projectID, manuscriptID } = req.params
    const { content, target, connectuserID, source } = req.body
    validateParamsType(
      { name: 'projectID', value: projectID, type: 'string' },
      { name: 'manuscriptID', value: manuscriptID, type: 'string' },
      { name: 'connectuserID', value: connectuserID, type: 'string' },
      { name: 'content', value: content, type: 'string' }
    )
    return DIContainer.sharedContainer.containerService.createManuscriptNote(
      projectID,
      manuscriptID,
      content,
      connectuserID,
      source,
      target
    )
  }

  async collaborators(req: Request): Promise<UserCollaborator[]> {
    const { projectID } = req.params

    validateRequestParams(req, ['projectID'])

    const token = authorizationBearerToken(req)
    const payload = jwt.decode(token)
    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }
    const userID = ContainerService.userIdForSync(payload.userId)
    return await DIContainer.sharedContainer.containerService.getCollaborators(projectID, userID)
  }
  /**
   * Get container archive.
   * @param req Request express request.
   */
  async getArchive(req: Request) {
    const { projectID, manuscriptID } = req.params
    const { onlyIDs } = req.query
    const { accept: acceptHeader } = req.headers

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    validateParamsType({ name: 'projectID', value: projectID, type: 'string' })
    validateRequestOptionalParams([projectID, 'projectID'])
    const token = authorizationBearerToken(req)

    const getAttachments = acceptHeader !== 'application/json'

    const userID = req.user._id
    try {
      return DIContainer.sharedContainer.containerService.getArchive(
        userID,
        projectID,
        manuscriptID,
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
    const { containerID, manuscriptID } = req.params
    const { onlyIDs } = req.query

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    validateParamsType({ name: 'containerID', value: containerID, type: 'string' })
    // will fail of the user is not a collaborator on the project
    const canAccess = await DIContainer.sharedContainer.containerService.checkUserContainerAccess(
      req.user._id,
      containerID
    )

    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerID)
    }

    validateParamsType({ name: 'manuscriptID', value: manuscriptID, type: 'string' })
    const token = authorizationBearerToken(req)

    const getAttachments = true
    const includeExt = false
    const userID = req.user._id
    const archive = await DIContainer.sharedContainer.containerService.getArchive(
      userID,
      containerID,
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
    validateParamsType(
      { name: 'containerID', value: containerID, type: 'string' },
      { name: 'scope', value: scope, type: 'string' }
    )
    return DIContainer.sharedContainer.containerService.accessToken(user._id, scope, containerID)
  }

  async getProductionNotes(req: Request) {
    const { projectID, manuscriptID } = req.params
    validateParamsType(
      { name: 'projectID', value: projectID, type: 'string' },
      { name: 'manuscriptID', value: manuscriptID, type: 'string' }
    )
    return DIContainer.sharedContainer.containerService.getProductionNotes(projectID, manuscriptID)
  }
  async deleteModel(req: Request): Promise<void> {
    const { projectID, manuscriptID, modelID } = req.params
    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    validateRequestParams(req, ['projectID', 'manuscriptID', 'modelID'])
    const userID = ContainerService.userIdForSync(req.user._id)
    await this.validateUserPermissions(userID, projectID)
    await this.validateManuscriptExists(userID, manuscriptID)
    await this.validateModelExists(projectID, modelID)
    return await DIContainer.sharedContainer.projectRepository.removeResource(modelID)
  }
  async delete(req: Request): Promise<void> {
    const { containerID } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    validateRequestParams(req, ['containerID'])
    validateParamsType({ name: 'container id', value: containerID, type: 'string' })

    await DIContainer.sharedContainer.containerService.deleteContainer(containerID, req.user)
  }

  async upsertManuscriptToProject(
    project: Container,
    json: any,
    unzipRoot: string | null,
    userID: string,
    manuscriptID?: string,
    templateID?: string
  ): Promise<Container> {
    const userID = ContainerService.userIdForSync(userID)
    let manuscriptObject = json.data.find((model: Model) => model.objectType === 'MPManuscript')
    if (manuscriptID) {
      manuscriptObject._id = manuscriptID
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
    const template = templateID
      ? await DIContainer.sharedContainer.templateRepository.getById(templateID)
      : null

    let templateFound: boolean = templateID !== undefined && template !== null

    if (!templateFound && templateID) {
      templateFound = await DIContainer.sharedContainer.pressroomService.validateTemplateId(
        templateID
      )
    }

    if (!templateFound && templateID) {
      throw new MissingTemplateError(templateID)
    }

    manuscriptObject = {
      ...manuscriptObject,
      createdAt,
      updatedAt: createdAt,
      sessionID,
      containerID: project._id,
    }

    if (templateFound) {
      manuscriptObject['prototype'] = templateID
    }

    manuscriptID
      ? await DIContainer.sharedContainer.manuscriptRepository.patch(
          manuscriptObject._id,
          manuscriptObject,
          userID
        )
      : await DIContainer.sharedContainer.manuscriptRepository.create(manuscriptObject, userID)

    // call it without userID because access control has already happened
    await DIContainer.sharedContainer.containerService.upsertProjectModels(docs)

    return manuscriptObject
  }

  async validateUserPermissions(userID: string, projectID: string) {
    const canEdit = await DIContainer.sharedContainer.containerService.checkIfCanEdit(
      userID,
      projectID
    )
    if (!canEdit) {
      throw new RoleDoesNotPermitOperationError(`permission denied`, userID)
    }
  }
  async validateManuscriptExists(userID: string, manuscriptID: string) {
    const manuscriptsObj = DIContainer.sharedContainer.manuscriptRepository.getById(
      manuscriptID,
      userID
    )
    if (!manuscriptsObj) {
      throw new MissingManuscriptError(manuscriptID)
    }
  }
  async validateModelExists(projectID: string, modelID: string) {
    const modelExists = DIContainer.sharedContainer.projectRepository.resourceExists(
      projectID,
      modelID
    )
    if (!modelExists) {
      throw new MissingModelError(modelID)
    }
  }
  async validateManuscriptReferences(data: any[]): Promise<void> {
    const manuscriptIDSet: Set<string> = new Set(
      data.map((doc: any) => {
        return doc.manuscriptID ? doc.manuscriptID : 'undefined'
      })
    )
    manuscriptIDSet.delete('undefined')
    if (manuscriptIDSet.size > 1) {
      throw new ValidationError(`contains multiple manuscriptIDs`, data)
    } else if (manuscriptIDSet.size === 1) {
      const [first] = manuscriptIDSet
      const manuscript = await DIContainer.sharedContainer.manuscriptRepository.getById(first)
      if (!manuscript) {
        throw new RecordNotFoundError(`referenced manuscript not found`)
      }
    }
  }
}
