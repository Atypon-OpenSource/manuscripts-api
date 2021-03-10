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
  ContainerRepository
} from '../../Models/ContainerModels'
import { isLoginTokenPayload, timestamp } from '../../Utilities/JWT/LoginTokenPayload'
import {
  InvalidCredentialsError,
  UnexpectedUserStatusError,
  UserBlockedError,
  UserNotVerifiedError,
  ValidationError,
  UserRoleError,
  RecordNotFoundError,
  InvalidScopeNameError,
  ConflictingRecordError
} from '../../Errors'
import { isBlocked, User } from '../../Models/UserModels'
import { UserActivityEventType } from '../../Models/UserEventModels'
import { IUserService } from '../User/IUserService'
import { EmailService } from '../Email/EmailService'
import { ContainerInvitationRepository } from '../../DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { config } from '../../Config/Config'
import { ScopedAccessTokenConfiguration } from '../../Config/ConfigurationTypes'
import { ManuscriptNoteRepository } from '../../DataAccess/ManuscriptNoteRepository/ManuscriptNoteRepository'
import { ManuscriptNote, ExternalFile, ObjectTypes } from '@manuscripts/manuscripts-json-schema'
import { UserService } from '../User/UserService'
import { DIContainer } from '../../DIContainer/DIContainer'
import { ExternalFileRepository } from '../../DataAccess/ExternalFileRepository/ExternalFileRepository'
import { IManuscriptRepository } from '../../DataAccess/Interfaces/IManuscriptRepository'
import { SnapshotRepository } from '../../DataAccess/SnapshotRepository/SnapshotRepository'

const JSZip = require('jszip')

export class ContainerService implements IContainerService {
  constructor (
    private containerType: ContainerType,
    private userRepository: IUserRepository,
    private userService: IUserService,
    private activityTrackingService: UserActivityTrackingService,
    private userStatusRepository: IUserStatusRepository,
    private containerRepository: ContainerRepository,
    private containerInvitationRepository: ContainerInvitationRepository,
    private emailService: EmailService,
    private manuscriptRepository: IManuscriptRepository,
    private manuscriptNoteRepository: ManuscriptNoteRepository,
    private externalFileRepository: ExternalFileRepository,
    private snapshotRepository: SnapshotRepository
  ) {}

  public async containerCreate (
    token: string,
    _id: string | null
  ): Promise<Container> {
    const payload = jsonwebtoken.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const user = await this.userRepository.getById(payload.userId)

    if (!user) {
      throw new InvalidCredentialsError(`User not found.`)
    }

    const userStatus = await this.userStatusRepository.statusForUserId(
      user._id
    )

    if (!userStatus) {
      throw new UnexpectedUserStatusError('User status not found.', user)
    }

    if (isBlocked(userStatus, new Date())) {
      throw new UserBlockedError('User account is blocked', user, userStatus)
    }

    if (!userStatus.isVerified) {
      throw new UserNotVerifiedError('User is not verified.', user, userStatus)
    }

    const containerID = _id ? _id : uuid_v4()

    const newContainer = this.createContainer(
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

  public async deleteContainer (containerId: string, user: User): Promise<void> {
    const container = await this.containerRepository.getById(containerId)

    if (!container) {
      throw new RecordNotFoundError(
        `Container with id ${containerId} was not found.`
      )
    }

    const userID = ContainerService.userIdForSync(user._id)

    if (!container.owners.includes(userID)) {
      throw new InvalidCredentialsError(
        `User ${userID} is not an owner.`
      )
    }

    await this.containerRepository.removeWithAllResources(containerId)
  }

  public async getContainer (containerId: string): Promise<Container> {
    const container = await this.containerRepository.getById(containerId)

    if (!container) {
      throw new RecordNotFoundError(
        `Container with id ${containerId} was not found`
      )
    }

    return container
  }

  public async manageUserRole (
    user: User,
    containerId: string,
    managedUser: { userId: string, connectUserId: string },
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

    if (!this.isOwner(container, user._id)) {
      throw new UserRoleError('User must be an owner to manage roles', newRole)
    }

    const isServer = this.validateSecret(secret)

    await this.validateManagedUser(managedUserObj._id, user._id, container, newRole, isServer)

    if (this.isOwner(container, managedUserObj._id) && container.owners.length < 2) {
      throw new UserRoleError('User is the only owner', newRole)
    }

    await this.updateContainerUser(containerId, newRole, managedUserObj)
  }

  private validateSecret = (secret?: string) =>
    secret ? secret === config.auth.serverSecret : false

  public async validateManagedUser (
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
      !this.isContainerUser(container, managedUserId)
    ) {
      throw new ValidationError('User is not in container', managedUserId)
    }

    if (managedUserId === '*' && (newRole === 'Owner' || newRole === 'Writer')) {
      throw new ValidationError('User can not be owner or writer', managedUserId)
    }
  }

  private async getValidUser (userId: string): Promise<User> {
    const databaseUserId = ContainerService.userIdForDatabase(userId)
    const addedUser = await this.userRepository.getById(databaseUserId)
    if (!addedUser) throw new ValidationError(`Invalid user id`, userId)
    return addedUser
  }

  public async addContainerUser (
    containerID: string,
    role: ContainerRole,
    userId: string,
    addingUser: User | null
  ): Promise<boolean> {
    const container = await this.getContainer(containerID)

    const addedUser = await this.getValidUser(userId)

    const title: string | undefined = container.title
    const owners = _.cloneDeep(container.owners)
    const writers = _.cloneDeep(container.writers)
    const viewers = _.cloneDeep(container.viewers)

    userId = ContainerService.userIdForSync(userId)

    if (role === ContainerRole.Owner) {
      owners.push(userId)
    } else if (role === ContainerRole.Viewer) {
      viewers.push(userId)
    } else if (role === ContainerRole.Writer) {
      writers.push(userId)
    } else {
      throw new ValidationError('Invalid role.', role)
    }

    if (!this.isContainerUser(container, userId)) {
      await this.updateContainer(containerID, title, owners, writers, viewers)
      await this.notifyForAddingUser(container, role, addedUser, addingUser)

      return true
    }
    return false
  }

  public ensureValidRole (role: ContainerRole | null) {
    if (role && !(role in ContainerRole)) {
      throw new ValidationError(`Invalid role '${role}'.`, role)
    }
  }

  public async updateContainerUser (
    containerID: string,
    role: ContainerRole | null,
    user: User
  ): Promise<void> {
    const container = await this.getContainer(containerID)
    const syncUserId = ContainerService.userIdForSync(user._id)

    this.ensureValidRole(role)

    const title = container.title
    const owners = _.cloneDeep(container.owners)
    const writers = _.cloneDeep(container.writers)
    const viewers = _.cloneDeep(container.viewers)

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
    }

    await this.handleRole(role, user, containerID)

    await this.updateContainer(containerID, title, owners, writers, viewers)
  }

  private async handleRole (
    role: ContainerRole | null,
    user: User,
    containerID: string
  ): Promise<void> {
    if (!role && user._id !== '*') {
      await this.containerInvitationRepository.deleteInvitations(
        containerID,
        user
      )
    }
  }

  public async updateContainer (
    containerId: string,
    title: string | undefined,
    owners: string[] | undefined,
    writers: string[] | undefined,
    viewers: string[] | undefined
  ): Promise<void> {
    await this.containerRepository.patch(
      containerId,
      {
        _id: containerId,
        title,
        owners: owners && owners.map(u => ContainerService.userIdForSync(u)),
        writers: writers && writers.map(u => ContainerService.userIdForSync(u)),
        viewers: viewers && viewers.map(u => ContainerService.userIdForSync(u))
      },
      {}
    )
  }

  public isContainerUser (container: Container, userId: string): boolean {
    return (
      this.isOwner(container, userId) ||
      this.isWriter(container, userId) ||
      this.isViewer(container, userId)
    )
  }

  public getUserRole (
    container: Container,
    userId: string
  ): ContainerRole | null {
    if (this.isOwner(container, userId)) {
      return ContainerRole.Owner
    } else if (this.isWriter(container, userId)) {
      return ContainerRole.Writer
    } else if (this.isViewer(container, userId)) {
      return ContainerRole.Viewer
    } else {
      return null
    }
  }

  public async getArchive (
    userID: string,
    containerID: string,
    manuscriptID: string | null,
    token: string | null,
    options: ArchiveOptions
  ) {
    const container = await this.containerRepository.getById(containerID)

    if (!container) {
      throw new RecordNotFoundError(`Container not found.`)
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

  private rewriteAttachmentFilename (originalName: string, mimeType: string, includeExt: boolean) {
    const updatedName = originalName.replace(':', '_')
    if (includeExt) {
      const [, ext] = mimeType.split('/')
      return `${updatedName}.${ext}`
    }
    return updatedName
  }

  // check getContainerResources & getProjectAttachments for generalization
  private async makeArchive (
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
    if (!options.getAttachments) return index

    const attachments = await this.containerRepository.getProjectAttachments(containerID, manuscriptID)

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
          const filename = (attachmentID === 'image')
            ? this.rewriteAttachmentFilename(key, type, options.includeExt)
            : attachmentID

          data.file(filename, attachment, {
            binary: true
          })
        }
      }
    }

    const archive = await zip.generateAsync({ type: 'nodebuffer' })

    return archive
  }

  public async getAttachment (userID: string, documentID: string, attachmentID?: string) {
    const doc: any = await this.containerRepository.getById(documentID)
    if (!doc) {
      throw new RecordNotFoundError(`Attachment document not found`)
    }

    const containerID = doc.containerID || doc.projectID
    const container = await this.containerRepository.getById(containerID)

    if (!container) {
      throw new RecordNotFoundError('container not found')
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
      body: await this.containerRepository.getAttachmentBody(documentID, attachmentID)
    }
  }

  public static findScope (scope: string, configScopes: ReadonlyArray<ScopedAccessTokenConfiguration>): ScopedAccessTokenConfiguration {
    const scopeInfo = configScopes.find(s => s.name === scope)

    if (!scopeInfo) {
      throw new InvalidScopeNameError(
        `The scope '${scope}' is invalid`,
        scope
      )
    }

    return scopeInfo
  }

  public async checkUserContainerAccess (userID: string, containerID: string): Promise<boolean> {
    const { owners, writers, viewers } = await this.getContainer(containerID)
    return [...owners, ...writers, ...viewers].includes(ContainerService.userIdForSync(userID))
  }

  public async checkIfOwnerOrWriter (userID: string, containerID: string): Promise<boolean> {
    const { owners, writers } = await this.getContainer(containerID)
    return [...owners, ...writers].includes(ContainerService.userIdForSync(userID))
  }

  public async accessToken (
    userID: string,
    scope: string,
    containerID: string
  ): Promise<any> {
    const container = await this.getContainer(containerID)
    const contributors = container.owners.concat(
      container.writers,
      container.viewers
    )
    const syncUserID = ContainerService.userIdForSync(userID)

    if (contributors.indexOf(syncUserID) < 0) {
      throw new ValidationError(
        'User must be a contributor in the container',
        syncUserID
      )
    }

    const scopeInfo = ContainerService.findScope(scope, config.scopes)

    const payload = {
      iss: config.API.hostname,
      sub: syncUserID,
      containerID,
      aud: scopeInfo.name
    }

    return jsonwebtoken.sign(payload, scopeInfo.secret, { header: { kid: scopeInfo.identifier }, algorithm: scopeInfo.publicKeyPEM === null ? 'HS256' : 'RS256', expiresIn: `${scopeInfo.expiry}m` })
  }

  private async notifyForAddingUser (
    container: Container,
    role: ContainerRole,
    addedUser: User,
    addingUser: User | null
  ) {
    const otherOwners = container.owners
      .filter(
        owner =>
          owner !== ContainerService.userIdForSync(addedUser._id) &&
          (!addingUser || owner !== ContainerService.userIdForSync(addingUser._id))
      )
      .map(owner => ContainerService.userIdForDatabase(owner))

    await this.emailService.sendContainerInvitationAcceptance(
      addedUser,
      addingUser,
      container,
      role,
      this.containerType
    )

    await this.announceAddedContributorToOwners(
      addedUser,
      addingUser,
      otherOwners,
      container,
      role
    )
  }

  private async announceAddedContributorToOwners (
    addedUser: User,
    addingUser: User | null,
    ownersId: string[],
    container: Container,
    role: ContainerRole
  ): Promise<void> {
    for (const ownerId of ownersId) {
      const owner = await this.userRepository.getById(ownerId)
      if (!owner) continue

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

  public static compareRoles (role1: ContainerRole, role2: ContainerRole) {
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

  public isOwner = (container: Container, userId: string) => {
    if (!container) {
      throw new RecordNotFoundError(`Record not found`)
    }
    return container.owners.indexOf(ContainerService.userIdForSync(userId)) > -1
  }

  public isWriter (container: Container, userId: string): boolean {
    if (!container) {
      throw new RecordNotFoundError(`Record not found`)
    }
    return container.writers.indexOf(ContainerService.userIdForSync(userId)) > -1
  }

  public isViewer (container: Container, userId: string): boolean {
    if (!container) {
      throw new RecordNotFoundError(`${this.containerType} not found`)
    }

    return container.viewers.indexOf(ContainerService.userIdForSync(userId)) > -1
  }

  public isPublic (container: Container): boolean {
    if (!container) {
      throw new RecordNotFoundError(`container not found`)
    }
    return container.viewers.indexOf('*') > -1
  }

  private async createContainer (
    containerId: string,
    ownerId: string
  ): Promise<Container> {
    const newContainer = await this.containerRepository.create(
      {
        _id: containerId,
        owners: [ownerId],
        writers: [],
        viewers: [],
        objectType: this.containerObjectType()
      },
      {}
    )
    return newContainer
  }

  async addManuscript (
    docs: any
  ): Promise<void> {
    return this.containerRepository.bulkDocs(docs)
  }

  /**
   * Validates user ID and ensures it starts with the prefix `User_`
   * @param id
   */
  public static userIdForSync (id: string) {
    if (!id.startsWith('User|') && !id.startsWith('User_') && !(id === '*')) {
      throw new ValidationError(`Invalid id ${id}`, id)
    }

    return id === '*' ? id : id.replace('|', '_')
  }

  /**
   * Validates user ID and ensures it starts with the prefix `User|`
   * @param id
   */
  public static userIdForDatabase (id: string) {
    if (!id.startsWith('User|') && !id.startsWith('User_')) {
      throw new ValidationError(`Invalid id prefix: ${id}`, id)
    }

    return id.replace('_', '|')
  }

  // TODO: Add other types.
  private containerObjectType (): 'MPProject' {
    switch (this.containerType) {
      case ContainerType.project:
        return 'MPProject'
    }
  }

  public async createManuscript (userID: string, containerID: string, manuscriptID?: string) {
    const container = await this.getContainer(containerID)

    const canAccess =
      this.isOwner(container, userID) || this.isWriter(container, userID)
    if (!canAccess) {
      throw new ValidationError(
        'User must be a contributor in the container',
        containerID
      )
    }

    const newManuscriptID = manuscriptID ? manuscriptID : uuid_v4()

    const manuscript = manuscriptID
      ? await this.manuscriptRepository.getById(manuscriptID)
      : null

    if (manuscript) {
      throw new ConflictingRecordError(
        'Manuscript with the same id exists',
        manuscript
      )
    }

    return this.manuscriptRepository.create(
      { _id: newManuscriptID, containerID, objectType: ObjectTypes.Manuscript },
      {}
    )
  }

  public async createManuscriptNote (
    containerID: string,
    manuscriptID: string,
    contents: string,
    connectUserID: string,
    source: string,
    target?: string
  ): Promise<ManuscriptNote> {

    const user = await DIContainer.sharedContainer.userRepository.getOne({ connectUserID })
    if (!user) {
      throw new RecordNotFoundError('user not found')
    }
    // will fail of the user is not a collaborator on the project
    const canAccess = await this.checkIfOwnerOrWriter(user._id, containerID)
    if (!canAccess) {
      throw new ValidationError('User must be a contributor in the container', containerID)
    }

    const stamp = timestamp()
    const userProfileID = UserService.profileID(user._id)
    if (target) {
      const note = await this.manuscriptNoteRepository.getById(target)
      if (!note) {
        throw new RecordNotFoundError(`Manuscript note with ID ${target} not found`)
      }
    }
    return this.manuscriptNoteRepository.create(
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
            timestamp: stamp
          }
        ]
      },
      {}
    )
  }

  public async getProductionNotes (
    containerID: string,
    manuscriptID: string
  ): Promise<ManuscriptNote[]> {
    return this.manuscriptNoteRepository.getProductionNotes(containerID, manuscriptID)
  }

  public async updateExternalFile (
    externalFileID: string,
    updatedDocument: ExternalFile
  ): Promise<ExternalFile> {
    const externalFile = await this.externalFileRepository.getById(externalFileID)
    if (!externalFile) {
      throw new RecordNotFoundError(`External file not found for id: ${externalFileID}`)
    }
    _.extend(externalFile, updatedDocument)
    return this.externalFileRepository.update(externalFileID, externalFile, {})
  }

  public async addExternalFiles (docs: ExternalFile[]) {
    const stamp = timestamp()
    const externalFiles: ExternalFile[] = []
    for (const externalFile of docs) {
      externalFiles.push({
        ...externalFile,
        _id: `${this.externalFileRepository.objectType}:${uuid_v4()}`,
        createdAt: stamp,
        updatedAt: stamp,
        sessionID: uuid_v4()
      })
    }
    return this.externalFileRepository.bulkDocs(externalFiles)
  }

  public async saveSnapshot (key: string) {
    const stamp = timestamp()
    const doc = {
      _id: `MPSnapshot:${uuid_v4()}`,
      objectType: ObjectTypes.Snapshot,
      s3Id: key,
      createdAt: stamp,
      updatedAt: stamp
    }
    return this.snapshotRepository.create(doc, {})
  }
}
