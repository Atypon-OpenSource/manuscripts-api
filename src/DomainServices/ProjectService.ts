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
  Journal,
  Manuscript,
  Model,
  ObjectTypes,
  Project,
  validate,
} from '@manuscripts/json-schema'
import {
  createArticleNode,
  getVersion,
  JATSExporter,
  JSONProsemirrorNode,
  parseJATSArticle,
  schema,
} from '@manuscripts/transform'
import decompress from 'decompress'
import fs from 'fs'
import { remove } from 'fs-extra'
import getStream from 'get-stream'
import JSZip from 'jszip'
import os from 'os'
import path from 'path'
import { Readable } from 'stream'

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
import { AuthorityService } from './AuthorityService'
import { ConfigService } from './ConfigService'

const EMPTY_PERMISSIONS = new Set<ProjectPermission>()
const DEFAULT_LOCALE = 'en-US'
export class ProjectService {
  constructor(
    private readonly projectClient: ProjectClient,
    private readonly userClient: UserClient,
    private readonly snapshotClient: SnapshotClient,
    private readonly documentClient: DocumentClient,
    private readonly configService: ConfigService
  ) {}

  public async createProject(userID: string, title?: string): Promise<Project> {
    return await this.projectClient.createProject(userID, title)
  }
  public async createManuscript(projectID: string, templateID?: string) {
    if (templateID) {
      const exists = await this.configService.hasDocument(templateID)
      if (!exists) {
        throw new MissingTemplateError(templateID)
      }
    }
    return await this.projectClient.createManuscript(projectID, templateID)
  }

  public async importJats(
    userID: string,
    file: Express.Multer.File,
    projectID: string,
    templateID: string
  ): Promise<Manuscript> {
    const template = await this.configService.getDocument(templateID)
    if (!template) {
      throw new MissingTemplateError(templateID)
    }

    const jats = await this.convert(file.path)

    const now = Math.round(Date.now() / 1000)
    const { node, journal } = parseJATSArticle(
      jats,
      JSON.parse(template).sectionCategories,
      templateID
    )

    const manuscriptModel = {
      _id: node.attrs.id,
      objectType: ObjectTypes.Manuscript,
      createdAt: now,
      updatedAt: now,
      containerID: projectID,
      DOI: node.attrs.doi,
      articleType: node.attrs.articleType,
      prototype: templateID,
      primaryLanguageCode: node.attrs.primaryLanguageCode,
    } as Manuscript

    await this.projectClient.bulkInsert([
      {
        ...journal,
        createdAt: now,
        updatedAt: now,
        containerID: projectID,
      },
      manuscriptModel,
    ])

    await this.documentClient.createDocument(
      {
        manuscript_model_id: manuscriptModel._id,
        project_model_id: projectID,
        doc: node,
        schema_version: getVersion(),
      },
      userID
    )

    return manuscriptModel
  }

  public async createManuscriptDoc(manuscript: Manuscript, projectID: string, userID: string) {
    const createDoc: CreateDoc = {
      manuscript_model_id: manuscript._id,
      project_model_id: projectID,
      doc: createArticleNode({
        articleType: manuscript.articleType,
        primaryLanguageCode: manuscript.primaryLanguageCode,
        doi: manuscript.DOI,
        id: manuscript._id,
        prototype: manuscript.prototype,
      }),
      schema_version: getVersion(),
    }
    await this.documentClient.createDocument(createDoc, userID)
  }

  public async makeArchive(projectID: string, options?: ArchiveOptions) {
    const onlyIDs = options?.onlyIDs || false
    const getAttachments = options?.getAttachments || false

    let resources
    if (!onlyIDs) {
      resources = await this.projectClient.getProjectResources(projectID)
    } else {
      resources = await this.projectClient.getProjectResourcesIDs(projectID)
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
    await this.projectClient.removeWithAllResources(projectID)
  }

  private async getManuscriptID(projectID: string): Promise<string | null> {
    const models = await this.projectClient.getProjectResources(projectID, [ObjectTypes.Manuscript])
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
    const project = await this.projectClient.getProject(projectID)
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
    await this.projectClient.removeAll(projectID)
    return await this.projectClient.bulkInsert(docs)
  }

  public async getProjectModels(projectID: string): Promise<Model[] | null> {
    return await this.projectClient.getProjectResources(projectID)
  }

  public async revokeRoles(projectID: string, connectUserID: string): Promise<void> {
    if (connectUserID !== '*') {
      return this.updateUserRole(projectID, connectUserID)
    }
    const project = await this.getProject(projectID)
    const updated = {
      _id: projectID,
      owners: project.owners,
      writers: [],
      viewers: [],
      editors: [],
      proofers: [],
      annotators: [],
    }
    await this.projectClient.patch(projectID, updated)
  }

  public async updateUserRole(
    projectID: string,
    connectUserID: string,
    role?: ProjectUserRole
  ): Promise<void> {
    const project = await this.getProject(projectID)
    const user = await this.userClient.findByConnectID(connectUserID)

    if (!user) {
      throw new ValidationError('Invalid user id', user)
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

    await this.projectClient.patch(projectID, updated)
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
      const manuscript = await this.projectClient.getProject(manuscriptID)
      if (!manuscript) {
        throw new ValidationError(`manuscript doesn't exist`, models)
      }
      if (manuscript.containerID !== projectID) {
        throw new ValidationError(`manuscript doesn't belong to project`, models)
      }
    }
  }

  private async convert(path: string) {
    const stream = fs.createReadStream(path)
    const { root, files } = await this.extract(stream)
    const lookupName = ['manuscript.XML', 'manuscript.xml']
    if (!files[lookupName[0]] && !files[lookupName[1]]) {
      throw new RecordNotFoundError('')
    }
    const file = files[lookupName[0]] ?? files[lookupName[1]]
    const doc = new DOMParser().parseFromString(file.data.toString(), 'application/xml')
    await remove(root)
    return doc
  }

  public async exportJats(projectID: string, manuscriptID: string, useSnapshot: boolean) {
    const article: JSONProsemirrorNode = useSnapshot
      ? ((await this.snapshotClient.getMostRecentSnapshot(manuscriptID))
          .snapshot as JSONProsemirrorNode)
      : AuthorityService.removeSuggestions(
          (await this.documentClient.findDocument(manuscriptID)).doc as JSONProsemirrorNode
        )
    const options = await this.getExportJatsOptions(projectID, article.attrs.prototype)
    return new JATSExporter().serializeToJATS(schema.nodeFromJSON(article), options)
  }

  private async getExportJatsOptions(projectID: string, templateID: string) {
    const projectModels = (await this.getProjectModels(projectID)) || []
    const journal = projectModels.find((m) => m.objectType === ObjectTypes.Journal)
    const template = await this.configService.getDocument(templateID)
    if (!template) {
      throw new ValidationError('manuscript template is empty', templateID)
    }
    const style = await this.citationStyleFromTemplate(template)
    const locale = await this.configService.getDocument(DEFAULT_LOCALE)
    if (!locale || !style) {
      throw new RecordNotFoundError('locale or style not found')
    }
    return {
      journal: journal ? (journal as Journal) : undefined,
      csl: { locale, style },
    }
  }

  public async updateManuscript(manuscript: Manuscript) {
    await this.projectClient.updateManuscript(manuscript._id, manuscript)
  }

  private async citationStyleFromTemplate(template: any) {
    //TODO: we need proper types for this
    const templateJson: any = JSON.parse(template)
    const bundle: any = await this.configService.getDocument(templateJson.bundle)
    const bundleJson: any = JSON.parse(bundle)
    const citationStyle: any = await this.configService.getDocument(bundleJson.csl._id)
    return citationStyle
  }

  private async extract(
    zip: Readable
  ): Promise<{ root: string; files: { [k: string]: decompress.File } }> {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'extracted-zip-'))
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
