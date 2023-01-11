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
import { StatusCodes } from 'http-status-codes'
import { RSA_JWK } from 'pem-jwk'

import { config } from '../../../Config/Config'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { ContainerService } from '../../../DomainServices/Container/ContainerService'
import {
  IllegalStateError,
  ManuscriptContentParsingError,
  MissingContainerError,
  ValidationError,
} from '../../../Errors'
import { Container, ContainerType } from '../../../Models/ContainerModels'
import { isString } from '../../../util'
import { authorizationBearerToken } from '../../BaseController'
import { ContainedBaseController, getContainerType } from '../../ContainedBaseController'

export class ContainersController extends ContainedBaseController {
  async create(req: Request): Promise<Container> {
    const _id = req.body._id
    const token = authorizationBearerToken(req)

    const { containerType } = req.params

    if (!(containerType in ContainerType)) {
      throw new ValidationError('containerType should be valid', containerType)
    }

    if (_id && !isString(_id)) {
      throw new ValidationError('container id should be a string', _id)
    }

    return DIContainer.sharedContainer.containerService[containerType].createContainer(token, _id)
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

  // tslint:disable-next-line:cyclomatic-complexity
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

  /**
   * Get container archive.
   * @param req Request express request.
   */
  async getArchive(req: Request) {
    const { containerID, manuscriptID } = req.params
    const { allowOrphanedDocs, onlyIDs } = req.query
    const { accept: acceptHeader } = req.headers

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    if (!isString(containerID)) {
      throw new ValidationError('containerID should be string', containerID)
    }

    let token = authorizationBearerToken(req)

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
          allowOrphanedDocs,
          includeExt: false,
        } as any
      )
    } catch (e) {
      throw new ManuscriptContentParsingError('Failed to make an archive.', e)
    }
  }

  async getAttachment(req: Request) {
    const { id } = req.params

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    if (!isString(id)) {
      throw new ValidationError('id should be a string', id)
    }

    return DIContainer.sharedContainer.containerService[ContainerType.project].getAttachment(
      req.user._id,
      id,
      req.params.attachmentKey
    )
  }

  async getBundle(req: Request, finish: CallableFunction) {
    const { containerID, manuscriptID } = req.params
    const { onlyIDs } = req.query

    if (!req.user) {
      throw new ValidationError('No user found', req.user)
    }

    if (!isString(containerID)) {
      throw new ValidationError('containerID should be string', containerID)
    }
    const containerType = getContainerType(containerID)

    // will fail of the user is not a collaborator on the project
    const canAccess = await DIContainer.sharedContainer.containerService[
      containerType
    ].checkUserContainerAccess(req.user._id, containerID)

    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerID)
    }

    if (!isString(manuscriptID)) {
      throw new ValidationError('manuscriptID should be string', manuscriptID)
    }

    let token = authorizationBearerToken(req)

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

    if (!isString(containerID)) {
      throw new ValidationError('containerID should be string', containerID)
    }

    if (!isString(scope)) {
      throw new ValidationError('scope should be string', scope)
    }

    const containerType = getContainerType(containerID)
    return DIContainer.sharedContainer.containerService[containerType].accessToken(
      user._id,
      scope,
      containerID
    )
  }

  // Deprecated (moved to .well-known)
  jwksForAccessScope(req: Request): { keys: [RSA_JWK] } {
    const { scope, containerType } = req.params
    if (!isString(containerType)) {
      throw new ValidationError('containerType should be a string', containerType)
    }
    if (!isString(scope)) {
      throw new ValidationError('scope should be a string', scope)
    }
    const s = ContainerService.findScope(scope, config.scopes)
    if (s.publicKeyJWK === null) {
      throw new ValidationError('scope does not have a public key', s.publicKeyJWK)
    }
    const jwk: any = Object.assign({}, s.publicKeyJWK)
    jwk.kid = s.identifier // see https://tools.ietf.org/html/rfc7517#section-4.5 re: 'kid'
    return { keys: [jwk] }
  }

  async createManuscript(req: Request) {
    const { containerID, manuscriptID } = req.params
    const { user } = req
    const { templateId } = req.body

    if (!user) {
      throw new ValidationError('No user found', user)
    }

    if (!isString(containerID)) {
      throw new ValidationError('containerID should be string', containerID)
    }

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

  async getProductionNotes(req: Request) {
    const { containerID, manuscriptID } = req.params

    if (!isString(containerID)) {
      throw new ValidationError('containerID should be string', containerID)
    }

    if (!isString(manuscriptID)) {
      throw new ValidationError('manuscriptID should be string', manuscriptID)
    }
    const containerType = getContainerType(containerID)
    return DIContainer.sharedContainer.containerService[containerType].getProductionNotes(
      containerID,
      manuscriptID
    )
  }

  async addProductionNote(req: Request) {
    const { containerID, manuscriptID } = req.params
    const { content, target, connectUserID, source } = req.body
    if (!isString(containerID)) {
      throw new ValidationError('containerID should be string', containerID)
    }

    if (!isString(manuscriptID)) {
      throw new ValidationError('manuscriptID should be string', manuscriptID)
    }

    if (!isString(connectUserID)) {
      throw new ValidationError('userConnectID should be string', connectUserID)
    }

    if (!isString(content)) {
      throw new ValidationError('content should be string', manuscriptID)
    }

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
}
