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
  MissingTemplateError,
  RoleDoesNotPermitOperationError,
  ValidationError,
} from '../../../Errors'
import { manuscriptIDTypes, Model } from '@manuscripts/manuscripts-json-schema'
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

    const { id }: any = await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].createContainer(token, null)

    await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].updateContainerTitleAndCollaborators(id, title, owners, undefined, undefined)

    return DIContainer.sharedContainer.containerService[ContainerType.project].getContainer(id)
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
      ? await DIContainer.sharedContainer.manuscriptRepository
          .getById(manuscriptId, userID)
          .then((doc) => {
            manuscriptObject._rev = doc?._rev
            return DIContainer.sharedContainer.manuscriptRepository.update(
              manuscriptObject._id,
              manuscriptObject,
              userID
            )
          })
      : await DIContainer.sharedContainer.manuscriptRepository.create(manuscriptObject, userID)

    await DIContainer.sharedContainer.containerService[ContainerType.project].addManuscript(
      docs,
      userID
    )

    return manuscriptObject
  }

  async saveProject(req: Request): Promise<Container> {
    const file = req.file
    const { projectId, manuscriptId } = req.params

    if (!projectId) {
      throw new ValidationError('projectId parameter must be specified', projectId)
    }
    if (!file || !file.path) {
      throw new ValidationError('Please upload project JSON file to import', projectId)
    }

    const token = authorizationBearerToken(req)
    const profile = await DIContainer.sharedContainer.userService.profile(token)
    if (!profile) {
      throw new ValidationError('Profile not found for token', profile)
    }

    const buffer = fs.readFileSync(file.path)
    const json = JSON.parse(buffer.toString())
    const project = await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].getContainer(projectId)

    if (!ContainerService.isOwner(project, req.user._id)) {
      throw new RoleDoesNotPermitOperationError(
        'User must be an owner to add manuscripts.',
        req.user._id
      )
    }

    const container = await this.upsertManuscriptToProject(project, json, null, manuscriptId)

    await remove(file.path)

    return container
  }
}
