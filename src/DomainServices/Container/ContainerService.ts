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

import * as jsonwebtoken from 'jsonwebtoken'
import { v4 as uuid_v4 } from 'uuid'
import * as _ from 'lodash'

import { IContainerService, ArchiveOptions } from './IContainerService'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import { UserActivityTrackingService } from '../UserActivity/UserActivityTrackingService'
import {
  ContainerRole,
  Container,
  ContainerType,
  ContainerRepository,
  ContainerObjectType,
} from '../../Models/ContainerModels'
import { isLoginTokenPayload, timestamp } from '../../Utilities/JWT/LoginTokenPayload'
import {
  InvalidCredentialsError,
  MissingUserStatusError,
  UserBlockedError,
  UserNotVerifiedError,
  ValidationError,
  UserRoleError,
  RecordNotFoundError,
  InvalidScopeNameError,
  ConflictingRecordError,
  MissingContainerError,
  MissingProductionNoteError,
  MissingUserRecordError,
  MissingTemplateError,
  RoleDoesNotPermitOperationError,
  ProductionNotesLoadError,
  ProductionNotesUpdateError,
} from '../../Errors'
import { isBlocked, User } from '../../Models/UserModels'
import { UserActivityEventType } from '../../Models/UserEventModels'
import { IUserService } from '../User/IUserService'
import { EmailService } from '../Email/EmailService'
import { ContainerInvitationRepository } from '../../DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { config } from '../../Config/Config'
import { ScopedAccessTokenConfiguration } from '../../Config/ConfigurationTypes'
import { ManuscriptNoteRepository } from '../../DataAccess/ManuscriptNoteRepository/ManuscriptNoteRepository'
import { UserService } from '../User/UserService'
import { DIContainer } from '../../DIContainer/DIContainer'
import { LibraryCollectionRepository } from '../../DataAccess/LibraryCollectionRepository/LibraryCollectionRepository'
import {
  ManuscriptNote,
  ExternalFile,
  ObjectTypes,
  Snapshot /*, Manuscript*/,
} from '@manuscripts/manuscripts-json-schema'
import { ExternalFileRepository } from '../../DataAccess/ExternalFileRepository/ExternalFileRepository'
import { CorrectionRepository } from '../../DataAccess/CorrectionRepository/CorrectionRepository'
import { IManuscriptRepository } from '../../DataAccess/Interfaces/IManuscriptRepository'
import { SnapshotRepository } from '../../DataAccess/SnapshotRepository/SnapshotRepository'
import { TemplateRepository } from '../../DataAccess/TemplateRepository/TemplateRepository'

const JSZip = require('jszip')

export class ContainerService implements IContainerService {
  constructor(
    private containerType: ContainerType,
    private userRepository: IUserRepository,
    private userService: IUserService,
    private activityTrackingService: UserActivityTrackingService,
    private userStatusRepository: IUserStatusRepository,
    private containerRepository: ContainerRepository,
    private containerInvitationRepository: ContainerInvitationRepository,
    private emailService: EmailService,
    private libraryCollectionRepository: LibraryCollectionRepository,
    private manuscriptRepository: IManuscriptRepository,
    private manuscriptNoteRepository: ManuscriptNoteRepository,
    private externalFileRepository: ExternalFileRepository,
    private correctionRepository: CorrectionRepository,
    private snapshotRepository: SnapshotRepository,
    private templateRepository: TemplateRepository
  ) {}

  public async createContainer(token: string, _id: string | null): Promise<Container> {
    const payload = jsonwebtoken.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const user = await this.userRepository.getById(payload.userId)

    if (!user) {
      throw new InvalidCredentialsError(`User not found.`)
    }

    const userStatus = await this.userStatusRepository.statusForUserId(user._id)

    if (!userStatus) {
      throw new MissingUserStatusError(user._id)
    }

    if (isBlocked(userStatus, new Date())) {
      throw new UserBlockedError(user, userStatus)
    }

    if (!userStatus.isVerified) {
      throw new UserNotVerifiedError(user, userStatus)
    }

    const containerID = _id ? _id : uuid_v4()

    const newContainer = this.handleContainerCreation(
      containerID,
      ContainerService.userIdForSync(user._id)
    )
    this.activityTrackingService.createEvent(
      user._id,
      UserActivityEventType.SuccessfulLogin,
      null,
      null
    )

    return newContainer
  }

  public async deleteContainer(containerId: string, user: User): Promise<void> {
    const container = await this.getContainer(containerId)

    const userID = ContainerService.userIdForSync(user._id)

    if (!ContainerService.isOwner(container, userID)) {
      throw new RoleDoesNotPermitOperationError(`User ${userID} is not an owner.`, userID)
    }

    await this.containerRepository.removeWithAllResources(containerId)
  }

  public async getContainer(containerId: string): Promise<Container> {
    const container = await this.containerRepository.getById(containerId)

    if (!container) {
      throw new MissingContainerError(containerId)
    }

    return container
  }

  public async manageUserRole(
    user: User,
    containerId: string,
    managedUser: { userId: string; connectUserId: string },
    newRole: ContainerRole | null,
    secret?: string
  ): Promise<void> {
    const container = await this.getContainer(containerId)

    const managedUserObj = managedUser.userId
      ? await this.userRepository.getById(ContainerService.userIdForDatabase(managedUser.userId))
      : await this.userRepository.getOne({ connectUserID: managedUser.connectUserId })

    if (!managedUserObj) {
      throw new ValidationError('Invalid managed user id', managedUser)
    }

    if (!ContainerService.isOwner(container, user._id)) {
      throw new RoleDoesNotPermitOperationError('User must be an owner to manage roles.', newRole)
    }

    const isServer = this.validateSecret(secret)

    await this.validateManagedUser(managedUserObj._id, user._id, container, newRole, isServer)

    if (ContainerService.isOwner(container, managedUserObj._id) && container.owners.length < 2) {
      throw new UserRoleError('User is the only owner', newRole)
    }

    await this.updateContainerUser(containerId, newRole, managedUserObj)
  }

  // tslint:disable-next-line: cyclomatic-complexity
  private async setUsersRolesInContainedLibraryCollections(
    containerId: string,
    userId: string,
    role: ContainerRole | null
  ) {
    const libraryCollections = await this.containerRepository.getContainedLibraryCollections(
      containerId
    )
    const syncUserId = ContainerService.userIdForSync(userId)
    for (let lc of libraryCollections) {
      const { owners, writers, viewers, editors, annotators } = this.updatedRoles(lc, userId, role)
      let inherited

      if (lc.inherited) {
        inherited = lc.inherited.includes(syncUserId) ? lc.inherited : [...lc.inherited, syncUserId]
      } else {
        inherited = [syncUserId]
      }

      await this.libraryCollectionRepository.patch(
        lc._id,
        {
          _id: containerId,
          owners: owners && owners.map((u) => ContainerService.userIdForSync(u)),
          writers: writers && writers.map((u) => ContainerService.userIdForSync(u)),
          viewers: viewers && viewers.map((u) => ContainerService.userIdForSync(u)),
          editors: editors && editors.map((u) => ContainerService.userIdForSync(u)),
          annotators: annotators && annotators.map((u) => ContainerService.userIdForSync(u)),
          inherited,
        },
        {}
      )
    }
  }

  private validateSecret = (secret?: string) =>
    secret ? secret === config.auth.serverSecret : false

  public async validateManagedUser(
    managedUserId: string,
    userId: string,
    container: Container,
    newRole: ContainerRole | null,
    isServer: boolean
  ): Promise<void> {
    if (
      !isServer &&
      managedUserId !== '*' &&
      userId !== managedUserId &&
      !ContainerService.isContainerUser(container, managedUserId)
    ) {
      throw new ValidationError('User is not in container', managedUserId)
    }

    if (managedUserId === '*' && (newRole === 'Owner' || newRole === 'Writer')) {
      throw new ValidationError('User can not be owner or writer', managedUserId)
    }
  }

  private async getValidUser(userId: string): Promise<User> {
    const databaseUserId = ContainerService.userIdForDatabase(userId)
    const addedUser = await this.userRepository.getById(databaseUserId)
    if (!addedUser) {
      throw new ValidationError(`Invalid user id`, userId)
    }
    return addedUser
  }

  public static containerTitle(container: Container) {
    return container.objectType === ObjectTypes.Project ? container.title : undefined
  }

  public async addContainerUser(
    containerID: string,
    role: ContainerRole,
    userId: string,
    addingUser: User | null,
    skipEmail?: boolean
  ): Promise<boolean> {
    const container = await this.getContainer(containerID)

    const addedUser = await this.getValidUser(userId)

    this.ensureValidRole(role)

    const title = ContainerService.containerTitle(container)
    const { owners, writers, viewers, editors, annotators } = this.updatedRoles(
      container,
      userId,
      role
    )

    if (!ContainerService.isContainerUser(container, userId)) {
      await this.updateContainerTitleAndCollaborators(
        containerID,
        title,
        owners,
        writers,
        viewers,
        editors,
        annotators
      )
      await this.setUsersRolesInContainedLibraryCollections(containerID, userId, role)

      if (!skipEmail) {
        await this.notifyForAddingUser(container, role, addedUser, addingUser)
      }

      return true
    }
    return false
  }

  public ensureValidRole(role: ContainerRole | null) {
    if (role && !(role in ContainerRole)) {
      throw new ValidationError(`Invalid role '${role}'.`, role)
    }
  }

  // tslint:disable-next-line:cyclomatic-complexity
  public async updateContainerUser(
    containerID: string,
    role: ContainerRole | null,
    user: User
  ): Promise<void> {
    const container = await this.getContainer(containerID)
    this.ensureValidRole(role)
    const { owners, writers, viewers, editors, annotators } = this.updatedRoles(
      container,
      user._id,
      role
    )

    const title = ContainerService.containerTitle(container)
    await this.handleInvitations(role, user, containerID)

    await this.updateContainerTitleAndCollaborators(
      containerID,
      title,
      owners,
      writers,
      viewers,
      editors,
      annotators
    )
    await this.setUsersRolesInContainedLibraryCollections(containerID, user._id, role)
  }

  // tslint:disable-next-line: cyclomatic-complexity
  private updatedRoles(
    container: Container,
    userId: string,
    role: ContainerRole | null
  ): {
    owners: string[]
    writers: string[]
    viewers: string[]
    editors?: string[]
    annotators?: string[]
  } {
    const syncUserId = ContainerService.userIdForSync(userId)

    const owners = _.cloneDeep(container.owners)
    const writers = _.cloneDeep(container.writers)
    const viewers = _.cloneDeep(container.viewers)
    let annotators = _.cloneDeep(container.annotators)
    let editors = _.cloneDeep(container.editors)
    const ownerIdx = owners.indexOf(syncUserId)
    const writerIdx = writers.indexOf(syncUserId)
    const viewerIdx = viewers.indexOf(syncUserId)

    if (ownerIdx > -1) {
      owners.splice(ownerIdx, 1)
    } else if (writerIdx > -1) {
      writers.splice(writerIdx, 1)
    } else if (viewerIdx > -1) {
      viewers.splice(viewerIdx, 1)
    }
    if (annotators && annotators.length) {
      const idx = annotators.indexOf(syncUserId)
      if (idx > -1) {
        annotators.splice(idx, 1)
      }
    }
    if (editors && editors.length) {
      const idx = editors.indexOf(syncUserId)
      if (idx > -1) {
        editors.splice(idx, 1)
      }
    }

    switch (role) {
      case ContainerRole.Owner:
        owners.push(syncUserId)
        break
      case ContainerRole.Writer:
        writers.push(syncUserId)
        break
      case ContainerRole.Viewer:
        viewers.push(syncUserId)
        break
      case ContainerRole.Annotator:
        if (annotators) {
          annotators.push(syncUserId)
        } else {
          annotators = [syncUserId]
        }
        break
      case ContainerRole.Editor:
        if (editors) {
          editors.push(syncUserId)
        } else {
          editors = [syncUserId]
        }
        break
    }

    return { owners, writers, viewers, editors, annotators }
  }

  private async handleInvitations(
    role: ContainerRole | null,
    user: User,
    containerID: string
  ): Promise<void> {
    if (!role && user._id !== '*') {
      await this.containerInvitationRepository.deleteInvitations(containerID, user)
    }
  }

  public async updateContainerTitleAndCollaborators(
    containerId: string,
    title: string | undefined,
    owners: string[] | undefined,
    writers: string[] | undefined,
    viewers: string[] | undefined,
    editors?: string[] | undefined,
    annotators?: string[] | undefined
  ): Promise<void> {
    await this.containerRepository.patch(
      containerId,
      {
        _id: containerId,
        title,
        owners: owners && owners.map((u) => ContainerService.userIdForSync(u)),
        writers: writers && writers.map((u) => ContainerService.userIdForSync(u)),
        viewers: viewers && viewers.map((u) => ContainerService.userIdForSync(u)),
        editors: editors && editors.map((u) => ContainerService.userIdForSync(u)),
        annotators: annotators && annotators.map((u) => ContainerService.userIdForSync(u)),
      },
      {}
    )
  }

  public static isContainerUser(container: Container, userId: string): boolean {
    return (
      this.isOwner(container, userId) ||
      this.isWriter(container, userId) ||
      this.isViewer(container, userId) ||
      this.isEditor(container, userId) ||
      this.isAnnotator(container, userId)
    )
  }

  public getUserRole(container: Container, userId: string): ContainerRole | null {
    if (ContainerService.isOwner(container, userId)) {
      return ContainerRole.Owner
    } else if (ContainerService.isWriter(container, userId)) {
      return ContainerRole.Writer
    } else if (ContainerService.isViewer(container, userId)) {
      return ContainerRole.Viewer
    } else if (ContainerService.isEditor(container, userId)) {
      return ContainerRole.Editor
    } else if (ContainerService.isAnnotator(container, userId)) {
      return ContainerRole.Annotator
    } else {
      return null
    }
  }

  public async getArchive(
    userID: string,
    containerID: string,
    manuscriptID: string | null,
    token: string | null,
    options: ArchiveOptions
  ) {
    const container = await this.containerRepository.getById(containerID)

    if (!container) {
      throw new MissingContainerError(containerID)
    }

    if (this.isPublic(container)) {
      return this.makeArchive(containerID, manuscriptID, options)
    }

    if (!token) {
      throw new InvalidCredentialsError('Token not supplied.')
    }

    await this.userService.authenticateUser(token)
    const canAccess = await this.checkUserContainerAccess(userID, containerID)
    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerID)
    }

    return this.makeArchive(containerID, manuscriptID, options)
  }

  public async getProject(
    userID: string,
    containerID: string,
    manuscriptID: string,
    token: string
  ) {
    if (!token) {
      throw new InvalidCredentialsError('Token not supplied.')
    }

    await this.userService.authenticateUser(token)
    const canAccess = await this.checkUserContainerAccess(userID, containerID)
    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerID)
    }

    const projectResources = await this.containerRepository.getContainerResources(
      containerID,
      manuscriptID,
      false
    )

    if (!projectResources) {
      throw new Error('Project is empty')
    }

    return projectResources
  }

  private rewriteAttachmentFilename(originalName: string, mimeType: string, includeExt: boolean) {
    const updatedName = originalName.replace(':', '_')
    if (includeExt) {
      const [, ext] = mimeType.split('/')
      return `${updatedName}.${ext}`
    }
    return updatedName
  }

  // check getContainerResources & getProjectAttachments for generalization
  private async makeArchive(
    containerID: string,
    manuscriptID: string | null,
    options: ArchiveOptions
  ) {
    let projectResourcesData
    if (!options.onlyIDs) {
      projectResourcesData = await this.containerRepository.getContainerResources(
        containerID,
        manuscriptID,
        options.allowOrphanedDocs
      )
    } else {
      projectResourcesData = await this.containerRepository.getContainerResourcesIDs(containerID)
    }

    const index = { version: '2.0', data: projectResourcesData }
    if (!options.getAttachments) {
      return index
    }

    const attachments = await this.containerRepository.getContainerAttachments(
      containerID,
      manuscriptID
    )

    const zip = new JSZip()
    zip.file('index.manuscript-json', JSON.stringify(index))

    if (attachments) {
      const data = zip.folder('Data')

      for (const key of attachments.keys()) {
        for (const attachmentID of Object.keys(attachments.get(key))) {
          const type = attachments.get(key)[attachmentID].content_type

          const attachment = await this.containerRepository.getAttachmentBody(key, attachmentID)

          // in MPFigure there will be a single attachment indexed as "image"
          // otherwise will have index corresponding to its actual filename
          const filename =
            attachmentID === 'image'
              ? this.rewriteAttachmentFilename(key, type, options.includeExt)
              : attachmentID

          data.file(filename, attachment, {
            binary: true,
          })
        }
      }
    }

    const archive = await zip.generateAsync({ type: 'nodebuffer' })

    return archive
  }

  public async getAttachment(userID: string, documentID: string, attachmentID?: string) {
    const doc: any = await this.containerRepository.getById(documentID)
    if (!doc) {
      throw new MissingContainerError(`Attachment document not found`)
    }

    const containerID = doc.containerID || doc.projectID
    const container = await this.containerRepository.getById(containerID)

    if (!container) {
      throw new MissingContainerError(containerID)
    }
    if (!this.isPublic(container)) {
      const canAccess = await this.checkUserContainerAccess(userID, containerID)
      if (!canAccess) {
        throw new ValidationError('User must be a contributor in the container', containerID)
      }
    }

    attachmentID = attachmentID || Object.keys(doc._attachments)[0]
    if (!doc._attachments[attachmentID]) {
      throw new RecordNotFoundError('Attachment not found')
    }

    return {
      contentType: doc._attachments[attachmentID].content_type,
      body: await this.containerRepository.getAttachmentBody(documentID, attachmentID),
    }
  }

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

  public async checkUserContainerAccess(userID: string, containerID: string): Promise<boolean> {
    let { owners, writers, viewers, editors, annotators } = await this.getContainer(containerID)

    editors = editors || []
    annotators = annotators || []

    return [...owners, ...writers, ...viewers, ...editors, ...annotators].includes(
      ContainerService.userIdForSync(userID)
    )
  }

  public async checkIfOwnerOrWriter(userID: string, containerID: string): Promise<boolean> {
    const { owners, writers } = await this.getContainer(containerID)
    return [...owners, ...writers].includes(ContainerService.userIdForSync(userID))
  }

  public async checkIfUserCanCreateNote(userID: string, containerID: string): Promise<boolean> {
    const { owners, writers, annotators, editors } = await this.getContainer(containerID)
    let usersWithAccess = [...owners, ...writers]
    if (annotators && annotators.length) {
      usersWithAccess = usersWithAccess.concat(annotators)
    }
    if (editors && editors.length) {
      usersWithAccess = usersWithAccess.concat(editors)
    }
    return usersWithAccess.includes(ContainerService.userIdForSync(userID))
  }

  public async accessToken(userID: string, scope: string, containerID: string): Promise<any> {
    const container = await this.getContainer(containerID)
    let contributors = container.owners.concat(container.writers, container.viewers)
    if (container.editors) {
      contributors = contributors.concat(container.editors)
    }
    if (container.annotators) {
      contributors = contributors.concat(container.annotators)
    }
    const syncUserID = ContainerService.userIdForSync(userID)

    if (contributors.indexOf(syncUserID) < 0) {
      throw new ValidationError('User must be a contributor in the container', syncUserID)
    }

    const scopeInfo = ContainerService.findScope(scope, config.scopes)

    const payload = {
      iss: config.API.hostname,
      sub: syncUserID,
      containerID,
      aud: scopeInfo.name,
    }

    const options = {
      header: {
        kid: scopeInfo.identifier,
      },
      algorithm: scopeInfo.publicKeyPEM === null ? 'HS256' : 'RS256',
      expiresIn: `${scopeInfo.expiry}m`,
    }

    return jsonwebtoken.sign(payload, scopeInfo.secret, options as any)
  }

  private async notifyForAddingUser(
    container: Container,
    role: ContainerRole,
    addedUser: User,
    addingUser: User | null
  ) {
    const otherOwners = container.owners
      .filter(
        (owner) =>
          owner !== ContainerService.userIdForSync(addedUser._id) &&
          (!addingUser || owner !== ContainerService.userIdForSync(addingUser._id))
      )
      .map((owner) => ContainerService.userIdForDatabase(owner))

    await this.emailService.sendContainerInvitationAcceptance(
      addedUser,
      addingUser,
      container,
      role,
      this.containerType
    )

    await this.announceAddedContributorToOwners(addedUser, addingUser, otherOwners, container, role)
  }

  private async announceAddedContributorToOwners(
    addedUser: User,
    addingUser: User | null,
    ownersId: string[],
    container: Container,
    role: ContainerRole
  ): Promise<void> {
    for (const ownerId of ownersId) {
      const owner = await this.userRepository.getById(ownerId)
      if (!owner) {
        continue
      }

      await this.emailService.sendOwnerNotificationOfCollaborator(
        owner,
        addedUser,
        addingUser,
        container,
        role,
        this.containerType
      )
    }
  }

  public static compareRoles(role1: ContainerRole, role2: ContainerRole) {
    if (role1 === role2) {
      return 0
    } else if (
      (role1 === ContainerRole.Owner && role2 !== ContainerRole.Owner) ||
      (role1 === ContainerRole.Writer && role2 === ContainerRole.Viewer)
    ) {
      return 1
    } else {
      return -1
    }
  }

  public static isOwner(container: Container, userId: string) {
    return container.owners.indexOf(ContainerService.userIdForSync(userId)) > -1
  }

  public static isWriter(container: Container, userId: string): boolean {
    return container.writers.indexOf(ContainerService.userIdForSync(userId)) > -1
  }

  public static isViewer(container: Container, userId: string): boolean {
    return container.viewers.indexOf(ContainerService.userIdForSync(userId)) > -1
  }

  public static isEditor(container: Container, userId: string): boolean {
    const editors = container.editors
    if (editors && editors.length) {
      return editors.indexOf(ContainerService.userIdForSync(userId)) > -1
    }
    return false
  }

  public static isAnnotator(container: Container, userId: string): boolean {
    const annotators = container.annotators
    if (annotators && annotators.length) {
      return annotators.indexOf(ContainerService.userIdForSync(userId)) > -1
    }
    return false
  }

  public isPublic(container: Container): boolean {
    return container.viewers.indexOf('*') > -1
  }

  private async handleContainerCreation(containerId: string, ownerId: string): Promise<Container> {
    const newContainer: any = {
      _id: containerId,
      owners: [ownerId],
      writers: [],
      viewers: [],
      objectType: this.containerObjectType(),
    }

    return this.containerRepository.create(newContainer, {})
  }

  async addManuscript(docs: any): Promise<void> {
    return this.containerRepository.bulkDocs(docs)
  }

  /**
   * Validates user ID and ensures it starts with the prefix `User_`
   * @param id
   */
  public static userIdForSync(id: string) {
    if (!id.startsWith('User|') && !id.startsWith('User_') && !(id === '*')) {
      throw new ValidationError(`Invalid id ${id}`, id)
    }

    return id === '*' ? id : id.replace('|', '_')
  }

  /**
   * Validates user ID and ensures it starts with the prefix `User|`
   * @param id
   */
  public static userIdForDatabase(id: string) {
    if (!id.startsWith('User|') && !id.startsWith('User_')) {
      throw new ValidationError(`Invalid id prefix: ${id}`, id)
    }

    return id.replace('_', '|')
  }

  private containerObjectType(): ContainerObjectType {
    switch (this.containerType) {
      case ContainerType.project:
        return ObjectTypes.Project
      case ContainerType.library:
        return ObjectTypes.Library
      case ContainerType.libraryCollection:
        return ObjectTypes.LibraryCollection
    }
  }

  // tslint:disable-next-line:cyclomatic-complexity
  public async createManuscript(
    userID: string,
    containerID: string,
    manuscriptID?: string,
    templateId?: string
  ) {
    const container = await this.getContainer(containerID)

    const canAccess =
      ContainerService.isOwner(container, userID) || ContainerService.isWriter(container, userID)
    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerID)
    }

    const newManuscriptID = manuscriptID ? manuscriptID : uuid_v4()

    const manuscript = manuscriptID ? await this.manuscriptRepository.getById(manuscriptID) : null

    if (manuscript) {
      throw new ConflictingRecordError('Manuscript with the same id exists', manuscript)
    }

    let template = templateId ? await this.templateRepository.getById(templateId) : null

    let templateFound: boolean = templateId !== undefined && template !== null

    if (!templateFound && templateId) {
      templateFound = await DIContainer.sharedContainer.pressroomService.validateTemplateId(
        templateId
      )
    }

    if (!templateFound && templateId) {
      throw new MissingTemplateError(templateId)
    }

    return this.manuscriptRepository
      .create(
        {
          _id: newManuscriptID,
          containerID,
          objectType: ObjectTypes.Manuscript,
          prototype: templateId,
        },
        {}
      )
      .then((res) => {
        return { id: res._id } as any
      })
  }

  public async createManuscriptNote(
    containerID: string,
    manuscriptID: string,
    contents: string,
    connectUserID: string,
    source: string,
    target?: string
  ): Promise<any> {
    const user = await DIContainer.sharedContainer.userRepository.getOne({ connectUserID })
    if (!user) {
      throw new MissingUserRecordError(connectUserID)
    }
    // will fail of the user is not a collaborator on the project
    const canAccess = await this.checkIfUserCanCreateNote(user._id, containerID)
    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerID)
    }

    const stamp = timestamp()
    const userProfileID = UserService.profileID(user._id)
    if (target) {
      const note = await this.manuscriptNoteRepository.getById(target)
      if (!note) {
        throw new MissingProductionNoteError(target)
      }
    }
    try {
      return this.manuscriptNoteRepository
        .create(
          {
            _id: `${this.manuscriptNoteRepository.objectType}:${uuid_v4()}`,
            createdAt: stamp,
            updatedAt: stamp,
            sessionID: uuid_v4(),
            objectType: this.manuscriptNoteRepository.objectType,
            containerID: containerID,
            manuscriptID: manuscriptID,
            contents: contents,
            target: target ? target : manuscriptID,
            source: source,
            contributions: [
              {
                _id: `MPContribution:${uuid_v4()}`,
                objectType: 'MPContribution',
                profileID: userProfileID,
                timestamp: stamp,
              },
            ],
          },
          {}
        )
        .then((res) => {
          return { id: res._id, ok: true }
        })
    } catch (e) {
      throw new ProductionNotesUpdateError()
    }
  }

  public async getProductionNotes(
    containerID: string,
    manuscriptID: string
  ): Promise<ManuscriptNote[]> {
    try {
      return this.manuscriptNoteRepository.getProductionNotes(containerID, manuscriptID)
    } catch (e) {
      throw new ProductionNotesLoadError()
    }
  }

  public async submitExternalFiles(docs: ExternalFile[]) {
    const stamp = timestamp()
    const externalFiles: ExternalFile[] = []
    const containerIDs: string[] = []
    const output: any[] = []
    for (const incomingDoc of docs) {
      const existingDoc = await this.externalFileRepository.findByContainerIDAndPublicUrl(
        incomingDoc.containerID,
        incomingDoc.manuscriptID,
        incomingDoc.publicUrl
      )
      if (existingDoc) {
        _.extend(existingDoc, { ...incomingDoc, updatedAt: stamp })
        const result = await this.externalFileRepository.update(existingDoc._id, existingDoc, {})
        output.push(result)
      } else {
        externalFiles.push({
          ...incomingDoc,
          _id: `${this.externalFileRepository.objectType}:${uuid_v4()}`,
          objectType: 'MPExternalFile',
          createdAt: stamp,
          updatedAt: stamp,
          sessionID: uuid_v4(),
        })
      }
      if (containerIDs.indexOf(incomingDoc.containerID) < 0) {
        containerIDs.push(incomingDoc.containerID)
        await this.updateDocumentSessionId(incomingDoc.containerID)
      }
    }
    if (externalFiles.length > 0) {
      const result = await this.externalFileRepository.bulkDocs(externalFiles)
      output.push(result)
    }
    return output
  }

  public async updateDocumentSessionId(docId: string) {
    const sessionID = uuid_v4()
    await DIContainer.sharedContainer.projectRepository.patch(docId, { _id: docId, sessionID }, {})
  }

  public async saveSnapshot(key: string, containerID: string, creator: string, name?: string) {
    const stamp = timestamp()
    const doc: Snapshot = {
      _id: `MPSnapshot:${uuid_v4()}`,
      objectType: ObjectTypes.Snapshot,
      s3Id: key,
      containerID,
      creator,
      createdAt: stamp,
      updatedAt: stamp,
    }
    if (name) {
      doc['name'] = name
    }
    return this.snapshotRepository.create(doc, {})
  }

  public async getCorrectionStatus(containerID: string, userId: string) {
    const canAccess = await this.checkUserContainerAccess(userId, containerID)
    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerID)
    }
    return this.correctionRepository.getCorrectionStatus(containerID)
  }
}
