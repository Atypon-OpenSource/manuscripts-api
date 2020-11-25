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
import { InvalidCredentialsError, UserRoleError, ValidationError } from '../../../Errors'
import { manuscriptIDTypes, Model } from '@manuscripts/manuscripts-json-schema'
import { remove } from 'fs-extra'
import jsonwebtoken from 'jsonwebtoken'
import { isLoginTokenPayload } from '../../../Utilities/JWT/LoginTokenPayload'
import uuid from 'uuid'
import tempy from 'tempy'

export class ProjectController extends BaseController implements IProjectController {
  async create (req: Request): Promise<Container> {
    const title = req.body.title

    const token = authorizationBearerToken(req)
    const payload = jsonwebtoken.decode(token)

    if (!isLoginTokenPayload(payload)) throw new InvalidCredentialsError('Unexpected token payload.')

    const owners = [payload.userId]

    const { id }: any = await DIContainer.sharedContainer.containerService[
      ContainerType.project
    ].containerCreate(token, null)

    await DIContainer.sharedContainer.containerService[ContainerType.project].updateContainer(
      id,
      title,
      owners,
      undefined,
      undefined
    )

    return DIContainer.sharedContainer.containerService[ContainerType.project].getContainer(id)
  }

  async add (req: Request): Promise<Container> {
    const file = req.file
    const { projectId } = req.params

    if (!projectId) throw new ValidationError('projectId parameter must be specified',projectId)

    if (!file || !file.path) throw new ValidationError('no file found, please upload a JATS XML file to import',projectId)

    const token = authorizationBearerToken(req)
    const profile = await DIContainer.sharedContainer.userService.profile(token)
    if (!profile) throw new ValidationError('Profile not found for token',profile)

    const stream = fs.createReadStream(file.path)
    const manuscript: Readable = await DIContainer.sharedContainer.pressroomService.importJATS(stream)
    stream.close()

    const project = await DIContainer.sharedContainer.containerService[ContainerType.project].getContainer(projectId)

    if (!DIContainer.sharedContainer.containerService[ContainerType.project].isOwner(project,req.user._id)) throw new UserRoleError('User must be an owner to add manuscripts',req.user._id)

    const container = await this.addManuscriptToProject(project,manuscript)

    await remove(file.path)

    return container
  }

  async addManuscriptToProject (project: Container, manuscript: Readable): Promise<Container> {
    const buffer = await getStream.buffer(manuscript)

    const unzipRoot = tempy.directory()
    const files = await decompress(buffer, unzipRoot)
    const byPath: any = files.reduce((acc,v) => ({ ...acc,[v.path]: v }),{})

    const json = JSON.parse(byPath['index.manuscript-json'].data)
    const manuscriptObject = json.data.find((model: Model) => model.objectType === 'MPManuscript')
    const sessionID = uuid.v4()
    const createdAt = Math.round(Date.now() / 1000)
    const docs = json.data.map((model: Model) => ({
      ...model,
      createdAt,
      updatedAt: createdAt,
      manuscriptID: manuscriptIDTypes.has(model.objectType) ? manuscriptObject._id : undefined,
      sessionID,
      containerID: project._id
    }))

    await remove(unzipRoot)

    await DIContainer.sharedContainer.containerService[ContainerType.project].addManuscript(docs)

    return manuscriptObject
  }
}
