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
  ContainedModel,
  Manuscript,
  manuscriptIDTypes,
  Model,
  ObjectTypes,
  Project,
  Section,
  validate,
} from '@manuscripts/json-schema'
import {
  Decoder,
  getVersion,
  hasObjectType,
  JATSExporter,
  ManuscriptNode,
  parseJATSArticle,
} from '@manuscripts/transform'
import decompress from 'decompress'
import fs from 'fs'
import { remove } from 'fs-extra'
import getStream from 'get-stream'
import JSZip from 'jszip'
import { Readable } from 'stream'
import tempy from 'tempy'

import { DIContainer } from '../DIContainer/DIContainer'
import {
  MissingContainerError,
  MissingTemplateError,
  RecordNotFoundError,
  SyncError,
  UserRoleError,
  ValidationError,
} from '../Errors'
import { CreateDoc } from '../Models/DocumentModels'
import { ArchiveOptions, ProjectPermission, ProjectUserRole } from '../Models/ProjectModels'
import {
  DocumentClient,
  ProjectClient,
  SnapshotClient,
  UserClient,
} from '../Models/RepositoryModels'
import { ConfigService } from './ConfigService'

const EMPTY_PERMISSIONS = new Set<ProjectPermission>()
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectClient,
    private readonly userClient: UserClient,
    private readonly snapshotClient: SnapshotClient,
    private readonly documentClient: DocumentClient,
    private readonly configService: ConfigService
  ) {}

  public async createProject(userID: string, title?: string): Promise<Project> {
    return await this.projectRepository.createProject(userID, title)
  }
  public async createManuscript(projectID: string, templateID?: string) {
    if (templateID) {
      const exists = await this.configService.hasDocument(templateID)
      if (!exists) {
        throw new MissingTemplateError(templateID)
      }
    }

    return await this.projectRepository.createManuscript(projectID, templateID)
  }

  public async importJats(
    userID: string,
    file: Express.Multer.File,
    projectID: string,
    templateID?: string
  ): Promise<Manuscript> {
    if (templateID) {
      const exists = await this.configService.hasDocument(templateID)
      if (!exists) {
        throw new MissingTemplateError(templateID)
      }
    }

    let models = await this.convert(file.path)

    const now = Math.round(Date.now() / 1000)

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
    await this.createManuscriptDoc(models, manuscript, projectID, userID)
    return manuscript
  }

  private async createManuscriptDoc(
    models: Model[],
    manuscript: Manuscript,
    projectID: string,
    userID: string
  ) {
    const modelMap = DIContainer.sharedContainer.projectService.getContainedModelsMap(
      models as ContainedModel[]
    )
    const article = DIContainer.sharedContainer.projectService.modelMapToManuscriptNode(
      modelMap,
      manuscript._id
    )

    const createDoc: CreateDoc = {
      manuscript_model_id: manuscript._id,
      project_model_id: projectID,
      doc: article,
      schema_version: getVersion(),
    }
    await DIContainer.sharedContainer.documentClient.createDocument(createDoc, userID)
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
      this.snapshotClient.deleteAllManuscriptSnapshots(manuscriptID),
      this.documentClient.deleteDocument(manuscriptID),
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
    const user = await this.userClient.findByConnectID(connectUserID)

    if (!user) {
      throw new ValidationError('Invalid user id', user)
    }

    if (user.id === '*' && (role === 'Owner' || role === 'Writer')) {
      throw new ValidationError('User can not be owner or writer', user.id)
    }

    if (ProjectService.isOnlyOwner(project, user.id)) {
      throw new UserRoleError('User is the only owner', role)
    }

    const updated = {
      _id: projectID,
      owners: project.owners.filter((u) => u !== user.id),
      writers: project.writers.filter((u) => u !== user.id),
      viewers: project.viewers.filter((u) => u !== user.id),
      editors: project.editors ? project.editors.filter((u) => u !== user.id) : [],
      proofers: project.proofers ? project.proofers.filter((u) => u !== user.id) : [],
      annotators: project.annotators ? project.annotators.filter((u) => u !== user.id) : [],
    }

    switch (role) {
      case ProjectUserRole.Owner:
        updated.owners.push(user.id)
        break
      case ProjectUserRole.Writer:
        updated.writers.push(user.id)
        break
      case ProjectUserRole.Viewer:
        updated.viewers.push(user.id)
        break
      case ProjectUserRole.Editor:
        updated.editors.push(user.id)
        break
      case ProjectUserRole.Proofer:
        updated.proofers.push(user.id)
        break
      case ProjectUserRole.Annotator:
        updated.annotators.push(user.id)
        break
    }

    await this.projectRepository.patch(projectID, updated)
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

  private async convert(path: string): Promise<Model[]> {
    const stream = fs.createReadStream(path)
    const { root, files } = await this.extract(stream)
    const lookupName = ['manuscript.XML', 'manuscript.xml']
    if (!files[lookupName[0]] && !files[lookupName[1]]) {
      throw new RecordNotFoundError('')
    }
    const file = files[lookupName[0]] ?? files[lookupName[1]]
    const doc = new DOMParser().parseFromString(file.data.toString(), 'application/xml')
    const models = parseJATSArticle(doc)
    await remove(root)
    return models
  }

  public async exportJats(
    projectID: string,
    manuscriptID: string,
    citationStyle: string,
    locale: string
  ) {
    const containedModels = await this.getContainedModels(projectID)
    const containedModelsMap = this.getContainedModelsMap(containedModels)
    const article = this.modelMapToManuscriptNode(containedModelsMap, manuscriptID)
    return new JATSExporter().serializeToJATS(article.content, containedModelsMap, manuscriptID, {
      csl: {
        style: citationStyle,
        locale,
      },
    })
  }

  public async getContainedModels(projectID: string) {
    return (await this.getProjectModels(projectID)) as ContainedModel[]
  }
  public getContainedModelsMap(projectResources: ContainedModel[]) {
    projectResources
      .filter(hasObjectType<Section>(ObjectTypes.Section))
      .forEach((section: Section) => {
        section.generatedLabel = true
      })
    return new Map<string, ContainedModel>(projectResources.map((model) => [model._id, model]))
  }

  public modelMapToManuscriptNode(
    modelMap: Map<string, ContainedModel>,
    manuscriptID: string
  ): ManuscriptNode {
    const decoder = new Decoder(modelMap, false)
    return decoder.createArticleNode(manuscriptID)
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
  public static isOwner(project: Project, userID: string) {
    return project.owners.indexOf(userID) > -1
  }

  public static isWriter(project: Project, userID: string): boolean {
    return project.writers.indexOf(userID) > -1
  }

  public static isViewer(project: Project, userID: string): boolean {
    return project.viewers.indexOf(userID) > -1
  }

  public static isEditor(project: Project, userID: string): boolean {
    const editors = project.editors
    if (editors && editors.length) {
      return editors.indexOf(userID) > -1
    }
    return false
  }

  public static isAnnotator(project: Project, userID: string): boolean {
    const annotators = project.annotators
    if (annotators && annotators.length) {
      return annotators.indexOf(userID) > -1
    }
    return false
  }

  public static isProofer(project: Project, userID: string): boolean {
    const proofers = project.proofers
    if (proofers && proofers.length) {
      return proofers.indexOf(userID) > -1
    }
    return false
  }
}
