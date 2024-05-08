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
import {
  Manuscript,
  manuscriptIDTypes,
  Model,
  ObjectTypes,
  Project,
  validate,
} from '@manuscripts/json-schema'
import decompress from 'decompress'
import fs from 'fs'
import { remove } from 'fs-extra'
import getStream from 'get-stream'
import jwt, { Algorithm } from 'jsonwebtoken'
import JSZip from 'jszip'
import { Readable } from 'stream'
import tempy from 'tempy'

import { config } from '../Config/Config'
import { ScopedAccessTokenConfiguration } from '../Config/ConfigurationTypes'
import { ProjectClient } from '../DataAccess/Repository'
import { DIContainer } from '../DIContainer/DIContainer'
import {
  InvalidScopeNameError,
  MissingContainerError,
  MissingTemplateError,
  SyncError,
  UserRoleError,
  ValidationError,
} from '../Errors'
import { ArchiveOptions, ProjectPermission, ProjectUserRole } from '../Models/ProjectModels'

const EMPTY_PERMISSIONS = new Set<ProjectPermission>()

export class ProjectService {
  constructor(private projectRepository: ProjectClient) {}
  public static findScope(
    scope: string,
    configScopes: ReadonlyArray<ScopedAccessTokenConfiguration>
  ): ScopedAccessTokenConfiguration {
    const scopeInfo = configScopes.find((s) => s.name === scope)

    if (!scopeInfo) {
      throw new InvalidScopeNameError(scope)
    }

    return scopeInfo
  }
  public async createProject(userID: string, title?: string): Promise<Project> {
    return await this.projectRepository.createProject(userID, title)
  }
  public async createManuscript(projectID: string, templateID?: string) {
    if (templateID) {
      const exists = await DIContainer.sharedContainer.configService.hasDocument(templateID)
      if (!exists) {
        throw new MissingTemplateError(templateID)
      }
    }

    return await this.projectRepository.createManuscript(projectID, templateID)
  }

  public async importJats(
    file: Express.Multer.File,
    projectID: string,
    templateID?: string
  ): Promise<Manuscript> {
    if (templateID) {
      const exists = await DIContainer.sharedContainer.configService.hasDocument(templateID)
      if (!exists) {
        throw new MissingTemplateError(templateID)
      }
    }

    const zip = await this.convert(file.path)

    const { root, files } = await this.extract(zip)

    if (!files || !files['index.manuscript-json']) {
      throw new ValidationError('JSON file not found', file.filename)
    }

    const now = Math.round(Date.now() / 1000)

    const index = files['index.manuscript-json'].data
    let models = JSON.parse(index.toString()).data as Model[]

    let manuscript = models.find((m) => m.objectType === ObjectTypes.Manuscript) as Manuscript

    if (!manuscript) {
      throw new ValidationError('Manuscript not found', file.filename)
    }

    models = models.map((m) => {
      const updated = {
        ...m,
        createdAt: now,
        updatedAt: now,
        containerID: projectID,
      }

      //why doesn't pressroom already include manuscriptID?
      if (manuscriptIDTypes.has(m.objectType)) {
        // @ts-ignore
        updated.manuscriptID = manuscript._id
      }

      return updated
    })

    manuscript = models.find((m) => m.objectType === ObjectTypes.Manuscript) as Manuscript
    if (templateID) {
      manuscript.prototype = templateID
    }

    this.validate(models)
    await this.projectRepository.bulkInsert(models)

    await remove(root)

    return manuscript
  }

  public async makeArchive(projectID: string, options?: ArchiveOptions) {
    const onlyIDs = options?.onlyIDs || false
    const getAttachments = options?.getAttachments || false

    let resources
    if (!onlyIDs) {
      resources = await this.projectRepository.getProjectResources(projectID)
    } else {
      resources = await this.projectRepository.getProjectResourcesIDs(projectID)
    }

    const index = { version: '2.0', data: resources }

    const zip = new JSZip()
    zip.file('index.manuscript-json', JSON.stringify(index))

    if (getAttachments) {
      return zip.generateAsync({ type: 'nodebuffer' })
    } else {
      // @ts-ignore
      return zip.file('index.manuscript-json').async('nodebuffer')
    }
  }

  public async deleteProject(projectID: string): Promise<void> {
    const manuscriptID = await this.getManuscriptID(projectID)
    if (manuscriptID) {
      await this.deleteManuscriptResources(manuscriptID)
    }
    await this.projectRepository.removeWithAllResources(projectID)
  }

  private async getManuscriptID(projectID: string): Promise<string | null> {
    const models = await this.projectRepository.getProjectResources(projectID, [
      ObjectTypes.Manuscript,
    ])
    if (!models) {
      throw new MissingContainerError(projectID)
    }
    return models[0]._id
  }

  private async deleteManuscriptResources(manuscriptID: string) {
    await Promise.all([
      DIContainer.sharedContainer.snapshotClient.deleteAllManuscriptSnapshots(manuscriptID),
      DIContainer.sharedContainer.documentClient.deleteDocument(manuscriptID),
    ])
  }

  public async getProject(projectID: string): Promise<Project> {
    const project = await this.projectRepository.getProject(projectID)
    if (!project) {
      throw new MissingContainerError(projectID)
    }

    return project
  }

  public async updateProject(projectID: string, models: Model[]) {
    // this will validate that the models belong to the correct project
    this.validateContainerIDs(projectID, models)
    // this will validate that the models reference a single, existing manuscript
    // that belongs to the project
    await this.validateManuscriptIDs(projectID, models)
    const docs = this.processManuscriptModels(models)
    await this.projectRepository.removeAll(projectID)
    return await this.projectRepository.bulkInsert(docs)
  }

  public async getProjectModels(projectID: string): Promise<Model[] | null> {
    return await this.projectRepository.getProjectResources(projectID)
  }

  public async updateUserRole(
    projectID: string,
    connectUserID: string,
    role: ProjectUserRole
  ): Promise<void> {
    const project = await this.getProject(projectID)
    const user = await DIContainer.sharedContainer.userClient.findByConnectID(connectUserID)

    if (!user) {
      throw new ValidationError('Invalid user id', user)
    }

    if (user.userID === '*' && (role === 'Owner' || role === 'Writer')) {
      throw new ValidationError('User can not be owner or writer', user.userID)
    }

    if (ProjectService.isOnlyOwner(project, user.userID)) {
      throw new UserRoleError('User is the only owner', role)
    }

    const updated = {
      _id: projectID,
      owners: project.owners.filter((u) => u !== user.userID),
      writers: project.writers.filter((u) => u !== user.userID),
      viewers: project.viewers.filter((u) => u !== user.userID),
      editors: project.editors ? project.editors.filter((u) => u !== user.userID) : [],
      proofers: project.proofers ? project.proofers.filter((u) => u !== user.userID) : [],
      annotators: project.annotators ? project.annotators.filter((u) => u !== user.userID) : [],
    }

    switch (role) {
      case ProjectUserRole.Owner:
        updated.owners.push(user.userID)
        break
      case ProjectUserRole.Writer:
        updated.writers.push(user.userID)
        break
      case ProjectUserRole.Viewer:
        updated.viewers.push(user.userID)
        break
      case ProjectUserRole.Editor:
        updated.editors.push(user.userID)
        break
      case ProjectUserRole.Proofer:
        updated.proofers.push(user.userID)
        break
      case ProjectUserRole.Annotator:
        updated.annotators.push(user.userID)
        break
    }

    await this.projectRepository.patch(projectID, updated)
  }

  public async generateAccessToken(
    projectID: string,
    userID: string,
    scope: string
  ): Promise<string> {
    const scopeInfo = config.scopes.find((s) => s.name === scope)

    if (!scopeInfo) {
      throw new InvalidScopeNameError(scope)
    }

    const payload = {
      iss: config.API.hostname,
      sub: userID,
      containerID: projectID,
      aud: scopeInfo.name,
    }

    const algorithm: Algorithm = scopeInfo.publicKeyPEM === null ? 'HS256' : 'RS256'

    const options = {
      header: {
        kid: scopeInfo.identifier,
        alg: algorithm,
      },
      expiresIn: `${scopeInfo.expiry}m`,
    }

    return jwt.sign(payload, scopeInfo.secret, options)
  }

  public async getPermissions(
    projectID: string,
    userID: string
  ): Promise<ReadonlySet<ProjectPermission>> {
    const project = await this.getProject(projectID)
    if (project.owners.includes(userID)) {
      return new Set([
        ProjectPermission.READ,
        ProjectPermission.UPDATE,
        ProjectPermission.DELETE,
        ProjectPermission.UPDATE_ROLES,
        ProjectPermission.CREATE_MANUSCRIPT,
      ])
    } else if (project.viewers.includes(userID)) {
      return new Set([ProjectPermission.READ])
    } else if (project.writers.includes(userID)) {
      return new Set([
        ProjectPermission.READ,
        ProjectPermission.UPDATE,
        ProjectPermission.CREATE_MANUSCRIPT,
      ])
    } else if (project.editors?.includes(userID)) {
      return new Set([ProjectPermission.READ, ProjectPermission.UPDATE])
    } else if (project.annotators?.includes(userID)) {
      return new Set([ProjectPermission.READ, ProjectPermission.UPDATE])
    } else if (project.proofers?.includes(userID)) {
      return new Set([ProjectPermission.READ, ProjectPermission.UPDATE])
    }
    return EMPTY_PERMISSIONS
  }

  public static isOnlyOwner(project: Project, userID: string): boolean {
    return project.owners.length === 1 && project.owners[0] === userID
  }

  private validateContainerIDs(projectID: string, models: any[]) {
    if (!models.every((m) => m.containerID === projectID)) {
      throw new ValidationError(`problem with containerID`, models)
    }
  }

  private async validateManuscriptIDs(projectID: string, models: any[]): Promise<void> {
    const manuscriptIDs = models.reduce((ids, model) => {
      model.manuscriptID && ids.add(model.manuscriptID)
      return ids
    }, new Set<string>())

    if (manuscriptIDs.size > 1) {
      throw new ValidationError(`contains multiple manuscriptIDs`, models)
    } else if (manuscriptIDs.size === 1) {
      const manuscriptID = manuscriptIDs.values().next().value
      const manuscript = await this.projectRepository.getProject(manuscriptID)
      if (!manuscript) {
        throw new ValidationError(`manuscript doesn't exist`, models)
      }
      if (manuscript.containerID !== projectID) {
        throw new ValidationError(`manuscript doesn't belong to project`, models)
      }
    }
  }

  private async convert(path: string): Promise<Readable> {
    const stream = fs.createReadStream(path)
    try {
      return await DIContainer.sharedContainer.pressroomService.importJATS(stream)
    } finally {
      stream.close()
    }
  }

  private async extract(
    zip: Readable
  ): Promise<{ root: string; files: { [k: string]: decompress.File } }> {
    const root = tempy.directory()
    const buffer = await getStream.buffer(zip)
    const files = await decompress(buffer, root)
    return {
      root,
      files: files.reduce((a, v) => ({ ...a, [v.path]: v }), {}),
    }
  }

  private validate(models: Model[]) {
    models.forEach((m) => {
      const error = validate(m)
      if (error) {
        throw new SyncError(error, m)
      }
    })
  }
  private processManuscriptModels(docs: Model[]) {
    const createdAt = Math.round(Date.now() / 1000)
    const models = docs.map((doc) => ({ ...doc, createdAt, updatedAt: createdAt }))
    this.validate(models)
    return models
  }

  public getUserRole(project: Project, userID: string): ProjectUserRole | null {
    if (ProjectService.isOwner(project, userID)) {
      return ProjectUserRole.Owner
    } else if (ProjectService.isWriter(project, userID)) {
      return ProjectUserRole.Writer
    } else if (ProjectService.isViewer(project, userID)) {
      return ProjectUserRole.Viewer
    } else if (ProjectService.isEditor(project, userID)) {
      return ProjectUserRole.Editor
    } else if (ProjectService.isAnnotator(project, userID)) {
      return ProjectUserRole.Annotator
    } else if (ProjectService.isProofer(project, userID)) {
      return ProjectUserRole.Proofer
    } else {
      return null
    }
  }
  public static isOwner(container: Project, userID: string) {
    return container.owners.indexOf(userID) > -1
  }

  public static isWriter(container: Project, userID: string): boolean {
    return container.writers.indexOf(userID) > -1
  }

  public static isViewer(container: Project, userID: string): boolean {
    return container.viewers.indexOf(userID) > -1
  }

  public static isEditor(container: Project, userID: string): boolean {
    const editors = container.editors
    if (editors && editors.length) {
      return editors.indexOf(userID) > -1
    }
    return false
  }

  public static isAnnotator(container: Project, userID: string): boolean {
    const annotators = container.annotators
    if (annotators && annotators.length) {
      return annotators.indexOf(userID) > -1
    }
    return false
  }

  public static isProofer(container: Project, userID: string): boolean {
    const proofers = container.proofers
    if (proofers && proofers.length) {
      return proofers.indexOf(userID) > -1
    }
    return false
  }
}
