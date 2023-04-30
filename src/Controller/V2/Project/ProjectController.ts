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

import { UserCollaborator } from '@manuscripts/json-schema'
import { Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import { RSA_JWK } from 'pem-jwk'

import { config } from '../../../Config/Config'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { ContainerService } from '../../../DomainServices/Container/ContainerService'
import { ArchiveOptions } from '../../../DomainServices/Container/IContainerService'
import {
  InvalidCredentialsError,
  ManuscriptContentParsingError,
  MissingContainerError,
  RecordNotFoundError,
  ValidationError,
} from '../../../Errors'
import { Container } from '../../../Models/ContainerModels'
import { isString } from '../../../util'
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
  async loadProject(req: Request) {
    const { projectId, manuscriptId } = req.params
    const { types } = req.body
    const modifiedSince = req.headers['if-modified-since']

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    if (!isString(projectId)) {
      throw new ValidationError('projectId should be string', projectId)
    }
    if (manuscriptId && !isString(manuscriptId)) {
      throw new ValidationError('manuscriptId should be string', manuscriptId)
    }
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
    const { userId, role } = req.body
    const { projectId } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }
    if (!projectId || !isString(projectId)) {
      throw new ValidationError('projectId must be string', projectId)
    }
    if (!userId || !isString(userId)) {
      throw new ValidationError('userId must be string', userId)
    }

    if (role !== null && !isString(role)) {
      throw new ValidationError('Role must be string or null', role)
    }

    await DIContainer.sharedContainer.containerService.manageUserRole(
      req.user,
      projectId,
      { connectUserId: userId },
      role
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

    if (!projectId || !isString(projectId)) {
      throw new ValidationError('projectId must be string', projectId)
    }

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
    if (!projectId || !isString(projectId)) {
      throw new ValidationError('projectId must be string', projectId)
    }

    if (manuscriptId && !isString(manuscriptId)) {
      throw new ValidationError('manuscriptId should be string', manuscriptId)
    }

    if (templateId && !isString(templateId)) {
      throw new ValidationError('templateId should be string', templateId)
    }
    return DIContainer.sharedContainer.containerService.createManuscript(
      user._id,
      projectId,
      manuscriptId,
      templateId
    )
  }

  async collaborators(req: Request): Promise<UserCollaborator[]> {
    const { projectId } = req.params

    if (!projectId || !isString(projectId)) {
      throw new ValidationError('projectId must be string', projectId)
    }

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
    if (!projectId || !isString(projectId)) {
      throw new ValidationError('projectId must be string', projectId)
    }
    if (manuscriptId && !isString(manuscriptId)) {
      throw new ValidationError('manuscriptId should be string', manuscriptId)
    }

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

  jwksForAccessScope(req: Request): { keys: [RSA_JWK] } {
    const { scope } = req.params
    if (!scope || !isString(scope)) {
      throw new ValidationError('scope must be string', scope)
    }

    const s = ContainerService.findScope(scope, config.scopes)
    if (s.publicKeyJWK === null) {
      throw new ValidationError('scope does not have a public key', s.publicKeyJWK)
    }
    const jwk: any = Object.assign({}, s.publicKeyJWK)
    jwk.kid = s.identifier // see https://tools.ietf.org/html/rfc7517#section-4.5 re: 'kid'
    return { keys: [jwk] }
  }

  async accessToken(req: Request): Promise<any> {
    const { projectId, scope } = req.params
    const user = req.user

    if (!projectId || !isString(projectId)) {
      throw new ValidationError('projectId must be string', projectId)
    }
    if (!scope || !isString(scope)) {
      throw new ValidationError('scope must be string', scope)
    }

    if (!user) {
      throw new ValidationError('No user found', user)
    }

    return DIContainer.sharedContainer.containerService.accessToken(user._id, scope, projectId)
  }
  async delete(req: Request): Promise<void> {
    const { projectId } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    if (!projectId || !isString(projectId)) {
      throw new ValidationError('projectId must be string', projectId)
    }

    await DIContainer.sharedContainer.containerService.deleteContainer(projectId, req.user)
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
