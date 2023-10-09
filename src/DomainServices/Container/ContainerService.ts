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

import {
  manuscriptIDTypes,
  ManuscriptNote,
  Model,
  ObjectTypes,
  validate,
} from '@manuscripts/json-schema'
import jwt from 'jsonwebtoken'
import JSZip from 'jszip'
import * as _ from 'lodash'
import { v4 as uuid_v4 } from 'uuid'

import { config } from '../../Config/Config'
import { ScopedAccessTokenConfiguration } from '../../Config/ConfigurationTypes'
import { ContainerInvitationRepository } from '../../DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { IManuscriptRepository } from '../../DataAccess/Interfaces/IManuscriptRepository'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import { ManuscriptNoteRepository } from '../../DataAccess/ManuscriptNoteRepository/ManuscriptNoteRepository'
import { TemplateRepository } from '../../DataAccess/TemplateRepository/TemplateRepository'
import { DIContainer } from '../../DIContainer/DIContainer'
import {
  ConflictingRecordError,
  InvalidCredentialsError,
  InvalidScopeNameError,
  MissingContainerError,
  MissingProductionNoteError,
  MissingTemplateError,
  MissingUserStatusError,
  ProductionNotesLoadError,
  ProductionNotesUpdateError,
  RecordNotFoundError,
  SyncError,
  UserBlockedError,
  UserNotVerifiedError,
  UserRoleError,
  ValidationError,
} from '../../Errors'
import { Container, ContainerRepository, ContainerRole } from '../../Models/ContainerModels'
import { UserActivityEventType } from '../../Models/UserEventModels'
import { isBlocked, User } from '../../Models/UserModels'
import { isLoginTokenPayload, timestamp } from '../../Utilities/JWT/LoginTokenPayload'
import { EmailService } from '../Email/EmailService'
import { IUserService } from '../User/IUserService'
import { UserService } from '../User/UserService'
import { UserActivityTrackingService } from '../UserActivity/UserActivityTrackingService'
import { ArchiveOptions, IContainerService } from './IContainerService'

export class ContainerService implements IContainerService {
  constructor(
    private userRepository: IUserRepository,
    private userService: IUserService,
    private activityTrackingService: UserActivityTrackingService,
    private userStatusRepository: IUserStatusRepository,
    private containerRepository: ContainerRepository,
    private containerInvitationRepository: ContainerInvitationRepository,
    private emailService: EmailService,
    private manuscriptRepository: IManuscriptRepository,
    private manuscriptNoteRepository: ManuscriptNoteRepository,
    private templateRepository: TemplateRepository
  ) {}

  public async createContainer(token: string, _id: string | null): Promise<Container> {
    const payload = jwt.decode(token)

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

  public async deleteContainer(containerId: string): Promise<void> {
    const container = await this.getContainer(containerId)
    await this.containerRepository.removeWithAllResources(container._id)
  }

  public async getContainer(containerId: string): Promise<Container> {
    const container = await this.containerRepository.getById(containerId)
    if (!container) {
      throw new MissingContainerError(containerId)
    }
    return container
  }

  public async manageUserRole(
    containerId: string,
    managedUser: { userId: string; connectUserId: string },
    newRole: ContainerRole | null
  ): Promise<void> {
    const container = await this.getContainer(containerId)

    const managedUserObj = managedUser.userId
      ? await this.userRepository.getById(ContainerService.userIdForDatabase(managedUser.userId))
      : await this.userRepository.getOne({ connectUserID: managedUser.connectUserId })

    if (!managedUserObj) {
      throw new ValidationError('Invalid managed user id', managedUser)
    }

    await this.validateManagedUser(managedUserObj._id, newRole)

    if (ContainerService.isOwner(container, managedUserObj._id) && container.owners.length < 2) {
      throw new UserRoleError('User is the only owner', newRole)
    }
    await this.updateContainerUser(containerId, newRole, managedUserObj)
  }

  public async validateManagedUser(
    managedUserId: string,
    newRole: ContainerRole | null
  ): Promise<void> {
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
    addingUser: User,
    skipEmail?: boolean
  ): Promise<boolean> {
    const container = await this.getContainer(containerID)

    const addedUser = await this.getValidUser(userId)

    this.ensureValidRole(role)

    const title = ContainerService.containerTitle(container)
    const { owners, writers, viewers, editors, proofers, annotators } = this.updatedRoles(
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
        proofers,
        annotators
      )

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
    // call it without userId intentionally
    const container = await this.getContainer(containerID)

    if (!container) {
      throw new MissingContainerError(containerID)
    }

    this.ensureValidRole(role)
    const { owners, writers, viewers, editors, proofers, annotators } = this.updatedRoles(
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
      proofers,
      annotators
    )
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
    proofers?: string[]
    annotators?: string[]
  } {
    const syncUserId = ContainerService.userIdForSync(userId)

    const owners = _.cloneDeep(container.owners)
    const writers = _.cloneDeep(container.writers)
    const viewers = _.cloneDeep(container.viewers)
    let annotators = _.cloneDeep(container.annotators)
    let proofers = _.cloneDeep(container.proofers)
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
    if (proofers && proofers.length) {
      const idx = proofers.indexOf(syncUserId)
      if (idx > -1) {
        proofers.splice(idx, 1)
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
      case ContainerRole.Proofer:
        if (proofers) {
          proofers.push(syncUserId)
        } else {
          proofers = [syncUserId]
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

    return { owners, writers, viewers, editors, proofers, annotators }
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
    proofers?: string[] | undefined,
    annotators?: string[] | undefined
  ): Promise<void> {
    // call it without userId intentionally
    await this.containerRepository.patch(containerId, {
      _id: containerId,
      title,
      owners: owners && owners.map((u) => ContainerService.userIdForSync(u)),
      writers: writers && writers.map((u) => ContainerService.userIdForSync(u)),
      viewers: viewers && viewers.map((u) => ContainerService.userIdForSync(u)),
      editors: editors && editors.map((u) => ContainerService.userIdForSync(u)),
      proofers: proofers && proofers.map((u) => ContainerService.userIdForSync(u)),
      annotators: annotators && annotators.map((u) => ContainerService.userIdForSync(u)),
    })
  }

  public static isContainerUser(container: Container, userId: string): boolean {
    return (
      this.isOwner(container, userId) ||
      this.isWriter(container, userId) ||
      this.isViewer(container, userId) ||
      this.isEditor(container, userId) ||
      this.isProofer(container, userId) ||
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
    } else if (ContainerService.isProofer(container, userId)) {
      return ContainerRole.Proofer
    } else {
      return null
    }
  }

  public async loadProject(
    containerID: string,
    manuscriptID: string | null,
    options: ArchiveOptions
  ) {
    return await this.containerRepository.getContainerResources(
      containerID,
      manuscriptID,
      options.types
    )
  }

  public async getArchive(
    containerID: string,
    manuscriptID: string | null,
    token: string | null,
    options: ArchiveOptions
  ) {
    const container = await this.containerRepository.getById(containerID)

    if (!container) {
      throw new MissingContainerError(containerID)
    }

    //This doesn't seem to be needed anymore
    // if (this.isPublic(container)) {
    //   return this.makeArchive(containerID, manuscriptID, options)
    // }

    if (!token) {
      throw new InvalidCredentialsError('Token not supplied.')
    }

    await this.userService.authenticateUser(token)

    return this.makeArchive(containerID, manuscriptID, options)
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
        options.types
      )
    } else {
      projectResourcesData = await this.containerRepository.getContainerResourcesIDs(
        containerID,
        options.types
      )
    }

    const index = { version: '2.0', data: projectResourcesData }

    const zip = new JSZip()
    zip.file('index.manuscript-json', JSON.stringify(index))

    if (options.getAttachments) {
      return zip.generateAsync({ type: 'nodebuffer' })
    } else {
      // @ts-ignore
      return zip.file('index.manuscript-json').async('nodebuffer')
    }
  }

  public async getAttachment(documentID: string, attachmentID?: string) {
    const doc: any = await this.containerRepository.getById(documentID)
    if (!doc) {
      throw new MissingContainerError(`Attachment document not found`)
    }

    const containerID = doc.containerID || doc.projectID
    const container = await this.getContainer(containerID)

    if (!container) {
      throw new MissingContainerError(containerID)
    }
    //This doesn't seem to be needed anymore
    // if (!this.isPublic(container)) {
    //   const canAccess = await this.checkUserContainerAccess(userID, containerID)
    //   if (!canAccess) {
    //     throw new ValidationError('User must be a contributor in the container', containerID)
    //   }
    // }

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
  public async accessToken(userID: string, scope: string, containerID: string): Promise<any> {
    const userSyncId = ContainerService.userIdForSync(userID)
    const container = await this.getContainer(containerID)
    const isContributor = ContainerService.isContainerUser(container, userID)

    if (!isContributor) {
      throw new ValidationError('User must be a contributor in the container', userID)
    }

    const scopeInfo = ContainerService.findScope(scope, config.scopes)

    const payload = {
      iss: config.API.hostname,
      sub: userSyncId,
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

    return jwt.sign(payload, scopeInfo.secret, options as any)
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
      role
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
        role
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

  public static isProofer(container: Container, userId: string): boolean {
    const proofers = container.proofers
    if (proofers && proofers.length) {
      return proofers.indexOf(ContainerService.userIdForSync(userId)) > -1
    }
    return false
  }

  // public isPublic(container: Container): boolean {
  //   return container.viewers.indexOf('*') > -1
  // }

  private async handleContainerCreation(containerId: string, ownerId: string): Promise<Container> {
    const newContainer: any = {
      _id: containerId,
      owners: [ownerId],
      writers: [],
      viewers: [],
      objectType: ObjectTypes.Project,
    }

    return this.containerRepository.create(newContainer, ownerId)
  }

  async upsertProjectModels(docs: any): Promise<any> {
    return this.containerRepository.bulkUpsert(docs)
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

  // tslint:disable-next-line:cyclomatic-complexity
  public async createManuscript(
    userId: string,
    containerID: string,
    manuscriptID?: string,
    templateId?: string
  ) {
    const userID = ContainerService.userIdForSync(userId)
    const container = await this.getContainer(containerID)
    const canAccess =
      ContainerService.isOwner(container, userId) || ContainerService.isWriter(container, userId)
    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerID)
    }

    const newManuscriptID = manuscriptID ? manuscriptID : uuid_v4()

    const manuscript = manuscriptID
      ? await this.manuscriptRepository.getById(manuscriptID, userID)
      : null
    if (manuscript) {
      throw new ConflictingRecordError('Manuscript with the same id exists', manuscript)
    }

    const template = templateId
      ? await this.templateRepository.getById(templateId /*, userID*/)
      : null
    let templateFound: boolean = templateId !== undefined && template !== null

    if (!templateFound && templateId) {
      templateFound = await DIContainer.sharedContainer.configService.hasDocument(templateId)
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
        userID
      )
      .then((res) => {
        return { id: res._id } as any
      })
  }

  public async createManuscriptNote(
    containerID: string,
    manuscriptID: string,
    contents: string,
    user: User,
    source: string,
    target?: string
  ): Promise<any> {
    const stamp = timestamp()
    const userProfileID = UserService.profileID(user._id)
    if (target) {
      const note = await this.manuscriptNoteRepository.getById(target /*, userID*/)
      if (!note) {
        throw new MissingProductionNoteError(target)
      }
    }
    try {
      return this.manuscriptNoteRepository
        .create({
          _id: `${this.manuscriptNoteRepository.objectType}:${uuid_v4()}`,
          createdAt: stamp,
          updatedAt: stamp,
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
        })
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

  public async processManuscriptModels(docs: Model[], containerID: string, manuscriptID: string) {
    const createdAt = Math.round(Date.now() / 1000)

    return docs.map((doc) => {
      const updatedDoc = {
        ...doc,
        createdAt,
        updatedAt: createdAt,
        containerID,
      } as any

      if (manuscriptIDTypes.has(doc.objectType)) {
        updatedDoc.manuscriptID = manuscriptID
      }

      const errorMessage = validate(updatedDoc)
      if (errorMessage) {
        throw new SyncError(errorMessage, updatedDoc)
      }

      return updatedDoc
    })
  }
}
