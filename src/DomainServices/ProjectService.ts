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
import { Model, ObjectTypes, Project } from '@manuscripts/json-schema'
import jwt, { Algorithm } from 'jsonwebtoken'
import JSZip from 'jszip'
import { v4 as uuid_v4 } from 'uuid'

import { config } from '../Config/Config'
import { IManuscriptRepository } from '../DataAccess/Interfaces/IManuscriptRepository'
import { IUserRepository } from '../DataAccess/Interfaces/IUserRepository'
import { TemplateRepository } from '../DataAccess/TemplateRepository/TemplateRepository'
import { DIContainer } from '../DIContainer/DIContainer'
import {
  ConflictingRecordError,
  InvalidScopeNameError,
  MissingContainerError,
  MissingTemplateError,
  UserRoleError,
  ValidationError,
} from '../Errors'
import { ContainerRepository, ProjectUserRole } from '../Models/ContainerModels'
import { ContainerService } from './Container/ContainerService'
import { ArchiveOptions } from './Container/IContainerService'

export enum ProjectPermission {
  READ,
  UPDATE,
  DELETE,
  UPDATE_ROLES,
  CREATE_MANUSCRIPT,
}

const EMPTY_PERMISSIONS = new Set<ProjectPermission>()

export class ProjectService {
  constructor(
    private containerRepository: ContainerRepository,
    private manuscriptRepository: IManuscriptRepository,
    private templateRepository: TemplateRepository,
    private userRepository: IUserRepository
  ) {}

  public async createProject(userID: string, id?: string, title?: string): Promise<Project> {
    const containerID = id || uuid_v4()

    const newContainer: any = {
      _id: containerID,
      objectType: ObjectTypes.Project,
      title: title,
      owners: [ContainerService.userIdForSync(userID)],
      writers: [],
      viewers: [],
    }

    return await this.containerRepository.create(newContainer)
  }

  public async createManuscript(projectID: string, manuscriptID?: string, templateID?: string) {
    if (manuscriptID) {
      const manuscript = await this.manuscriptRepository.getById(manuscriptID)
      if (manuscript) {
        throw new ConflictingRecordError('Manuscript with the same id exists', manuscript)
      }
    } else {
      manuscriptID = uuid_v4()
    }

    if (templateID) {
      const template = await this.templateRepository.getById(templateID)
      if (!template) {
        throw new MissingTemplateError(templateID)
      }
    }

    return await this.manuscriptRepository.create({
      _id: manuscriptID,
      objectType: ObjectTypes.Manuscript,
      containerID: projectID,
      prototype: templateID,
    })
  }

  public async makeArchive(projectID: string, manuscriptID?: string, options?: ArchiveOptions) {
    const onlyIDs = options?.onlyIDs || false
    const getAttachments = options?.getAttachments || false

    let resources
    if (!onlyIDs) {
      resources = await this.containerRepository.getContainerResources(
        projectID,
        manuscriptID || null
      )
    } else {
      resources = await this.containerRepository.getContainerResourcesIDs(projectID)
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
    //todo log
    await this.containerRepository.removeWithAllResources(projectID)
  }

  public async getProject(projectID: string): Promise<Project> {
    const project = await this.containerRepository.getById(projectID)

    if (!project) {
      throw new MissingContainerError(project)
    }

    return project
  }

  public async updateProject(projectID: string, models: Model[]) {
    // this will validate that the models belong to the correct project
    this.validateContainerIDs(projectID, models)
    // this will validate that the models reference a single, existing manuscript
    // that belongs to the project
    await this.validateManuscriptIDs(projectID, models)

    await this.containerRepository.bulkUpsert(models)
  }

  public async getProjectModels(projectID: string): Promise<Model[]> {
    return await this.containerRepository.getContainerResources(projectID, null)
  }

  public async updateUserRole(
    projectID: string,
    userID: string,
    role: ProjectUserRole
  ): Promise<void> {
    const project = await this.getProject(projectID)
    const user = await this.userRepository.getOne({ connectUserID: userID })

    if (!user) {
      throw new ValidationError('Invalid user id', user)
    }

    if (user._id === '*' && (role === 'Owner' || role === 'Writer')) {
      throw new ValidationError('User can not be owner or writer', user._id)
    }
    const userIdForSync = ContainerService.userIdForSync(user._id)

    if (
      ProjectService.isOnlyOwner(project, user._id) ||
      ProjectService.isOnlyOwner(project, userIdForSync)
    ) {
      throw new UserRoleError('User is the only owner', role)
    }

    const updated = {
      _id: projectID,
      owners: project.owners.filter((u) => u !== userID && u !== userIdForSync),
      writers: project.writers.filter((u) => u !== userID && u !== userIdForSync),
      viewers: project.viewers.filter((u) => u !== userID && u !== userIdForSync),
      editors: project.editors
        ? project.editors.filter((u) => u !== userID && u !== userIdForSync)
        : [],
      proofers: project.proofers
        ? project.proofers.filter((u) => u !== userID && u !== userIdForSync)
        : [],
      annotators: project.annotators
        ? project.annotators.filter((u) => u !== userID && u !== userIdForSync)
        : [],
    }

    switch (role) {
      case ProjectUserRole.Owner:
        updated.owners.push(userID)
        break
      case ProjectUserRole.Writer:
        updated.writers.push(userID)
        break
      case ProjectUserRole.Viewer:
        updated.viewers.push(userID)
        break
      case ProjectUserRole.Editor:
        updated.editors.push(userID)
        break
      case ProjectUserRole.Proofer:
        updated.proofers.push(userID)
        break
      case ProjectUserRole.Annotator:
        updated.annotators.push(userID)
        break
    }

    await this.containerRepository.patch(projectID, updated)
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
    const userIdForSync = ContainerService.userIdForSync(userID)
    const project = await this.getProject(projectID)
    if (project.owners.includes(userID) || project.owners.includes(userIdForSync)) {
      return new Set([
        ProjectPermission.READ,
        ProjectPermission.UPDATE,
        ProjectPermission.DELETE,
        ProjectPermission.UPDATE_ROLES,
        ProjectPermission.CREATE_MANUSCRIPT,
      ])
    } else if (project.viewers.includes(userID) || project.viewers.includes(userIdForSync)) {
      return new Set([ProjectPermission.READ])
    } else if (project.writers.includes(userID) || project.writers.includes(userIdForSync)) {
      return new Set([
        ProjectPermission.READ,
        ProjectPermission.UPDATE,
        ProjectPermission.CREATE_MANUSCRIPT,
      ])
    } else if (project.editors?.includes(userID) || project.editors?.includes(userIdForSync)) {
      return new Set([ProjectPermission.READ, ProjectPermission.UPDATE])
    } else if (
      project.annotators?.includes(userID) ||
      project.annotators?.includes(userIdForSync)
    ) {
      return new Set([ProjectPermission.READ, ProjectPermission.UPDATE])
    } else if (project.proofers?.includes(userID) || project.proofers?.includes(userIdForSync)) {
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
      const manuscript = await DIContainer.sharedContainer.manuscriptRepository.getById(
        manuscriptID
      )
      if (!manuscript) {
        throw new ValidationError(`manuscript doesn't exist`, models)
      }
      if (manuscript.containerID !== projectID) {
        throw new ValidationError(`manuscript doesn't belong to project`, models)
      }
    }
  }
}
