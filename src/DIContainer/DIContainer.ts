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

import jwksClientRSA from 'jwks-rsa' // the concrete JWKS client implementation

import { config } from '../Config/Config'
import { BucketKey } from '../Config/ConfigurationTypes'

import { Database } from '../DataAccess/Database'

import { IAMTokenVerifier } from './IAMTokenVerifier'
import { JWKSClient } from './JWKSClient' // our internal interface for JWKS

import { IServer } from '../Server/IServer'
import { Server } from '../Server/Server'

import { IDatabaseViewManager } from '../DataAccess/Interfaces/IDatabaseViewManager'
import { ContainerType, ContainerServiceMap } from '../Models/ContainerModels'
import { RepositoryLike, SGRepositoryLike } from '../DataAccess/Interfaces/IndexedRepository'

import { IUserRepository } from '../DataAccess/Interfaces/IUserRepository'
import { IUserTokenRepository } from '../DataAccess/Interfaces/IUserTokenRepository'
import { ISingleUseTokenRepository } from '../DataAccess/Interfaces/ISingleUseTokenRepository'
import { IClientApplicationRepository } from '../DataAccess/Interfaces/IClientApplicationRepository'
import { ICollaborationsRepository } from '../DataAccess/Interfaces/ICollaborationsRepository'
import { IInvitationTokenRepository } from '../DataAccess/Interfaces/IInvitationTokenRepository'
import { IUserStatusRepository } from '../DataAccess/Interfaces/IUserStatusRepository'
import { IUserEventRepository } from '../DataAccess/Interfaces/IUserEventRepository'
import { UserCollaboratorRepository } from '../DataAccess/UserCollaboratorRepository/UserCollaboratorRepository'
import { ProjectMementoRepository } from '../DataAccess/ProjectMementoRepository/ProjectMementoRepository'
import { ProjectSummaryRepository } from '../DataAccess/ProjectSummaryRepository/ProjectSummaryRepository'

import { InvitationRepository } from '../DataAccess/InvitationRepository/InvitationRepository'
import { UserRepository } from '../DataAccess/UserRepository/UserRepository'
import { UserTokenRepository } from '../DataAccess/UserTokenRepository/UserTokenRepository'
import { UserEmailRepository } from '../DataAccess/UserEmailRepository/UserEmailRepository'
import { IUserEmailRepository } from '../DataAccess/Interfaces/IUserEmailRepository'
import { SingleUseTokenRepository } from '../DataAccess/SingleUseTokenRepository/SingleUseTokenRepository'
import { ClientApplicationRepository } from '../DataAccess/ClientApplicationRepository/ClientApplicationRepository'
import { CollaborationsRepository } from '../DataAccess/CollaborationsRepository/CollaborationsRepository'
import { MemorizingClientApplicationRepository } from '../DataAccess/ClientApplicationRepository/MemorizingClientApplicationRepository'
import { UserEventRepository } from '../DataAccess/UserEventRepository/UserEventRepository'
import { UserStatusRepository } from '../DataAccess/UserStatusRepository/UserStatusRepository'
import { ProjectRepository } from '../DataAccess/ProjectRepository/ProjectRepository'
import { UserProfileRepository } from '../DataAccess/UserProfileRepository/UserProfileRepository'
import { InvitationTokenRepository } from '../DataAccess/InvitationTokenRepository/InvitationTokenRepository'
import { ContainerRequestRepository } from '../DataAccess/ContainerRequestRepository/ContainerRequestRepository'
import { ContainerInvitationRepository } from '../DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { ISubmissionRepository } from '../DataAccess/Interfaces/ISubmissionRepository'
import { SubmissionRepository } from '../DataAccess/SubmissionRepository/SubmissionRepository'

import { AuthService } from '../DomainServices/Auth/AuthService'
import { IAuthService } from '../DomainServices/Auth/IAuthService'
import { EmailService } from '../DomainServices/Email/EmailService'
import { SyncService } from '../DomainServices/Sync/SyncService'
import { ISyncService } from '../DomainServices/Sync/ISyncService'
import { IUserRegistrationService } from '../DomainServices/Registration/IUserRegistrationService'
import { UserRegistrationService } from '../DomainServices/Registration/UserRegistrationService'
import { UserService } from '../DomainServices/User/UserService'
import { IUserService } from '../DomainServices/User/IUserService'
import { UserActivityTrackingService } from '../DomainServices/UserActivity/UserActivityTrackingService'
import { ContainerInvitationService } from '../DomainServices/Invitation/ContainerInvitationService'
import { ContainerService } from '../DomainServices/Container/ContainerService'
import { FunctionService } from '../DataAccess/FunctionService'
import { DiscourseService } from '../DomainServices/Discourse/DiscourseService'
import { InvitationService } from '../DomainServices/Invitation/InvitationService'
import { IContainerInvitationService } from '../DomainServices/Invitation/IContainerInvitationService'
import { IContainerRequestService } from '../DomainServices/ContainerRequest/IContainerRequestService'
import { ContainerRequestService } from '../DomainServices/ContainerRequest/ContainerRequestService'
import { ISubmissionService } from '../DomainServices/Submission/ISubmissionService'
import { SubmissionService } from '../DomainServices/Submission/SubmissionService'
import { log } from '../Utilities/Logger'
import { IPressroomService } from '../DomainServices/Pressroom/IPressroomService'
import { PressroomService } from '../DomainServices/Pressroom/PressroomService'
import { ManuscriptNoteRepository } from '../DataAccess/ManuscriptNoteRepository/ManuscriptNoteRepository'
import { ExternalFileRepository } from '../DataAccess/ExternalFileRepository/ExternalFileRepository'
import { IManuscriptRepository } from '../DataAccess/Interfaces/IManuscriptRepository'
import { ManuscriptRepository } from '../DataAccess/ManuscriptRepository/ManuscriptRepository'
import { SnapshotRepository } from '../DataAccess/SnapshotRepository/SnapshotRepository'
import { CorrectionRepository } from '../DataAccess/CorrectionRepository/CorrectionRepository'
import { ShacklesService } from '../DomainServices/Shackles/ShacklesService'
import { IShacklesService } from '../DomainServices/Shackles/IShacklesService'
import { TemplateRepository } from '../DataAccess/TemplateRepository/TemplateRepository'

export class UninitializedContainerError extends Error {
  constructor () {
    super()
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ContainerReinitializationError extends Error {
  constructor () {
    super()
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class DIContainer {
  private static _sharedContainer: DIContainer | null = null

  static get sharedContainer (): DIContainer {
    if (DIContainer._sharedContainer === null) {
      throw new UninitializedContainerError()
    } else {
      return DIContainer._sharedContainer
    }
  }

  readonly server: IServer
  readonly userRepository: IUserRepository
  readonly userTokenRepository: IUserTokenRepository
  readonly userEmailRepository: IUserEmailRepository
  readonly singleUseTokenRepository: ISingleUseTokenRepository
  readonly applicationRepository: IClientApplicationRepository
  readonly collaborationsRepository: ICollaborationsRepository
  readonly emailService: EmailService
  readonly syncService: ISyncService
  readonly authService: IAuthService
  readonly userRegistrationService: IUserRegistrationService
  readonly activityTrackingService: UserActivityTrackingService
  readonly userStatusRepository: IUserStatusRepository
  readonly userEventRepository: IUserEventRepository
  readonly userService: IUserService
  readonly invitationRepository: InvitationRepository
  readonly containerInvitationRepository: ContainerInvitationRepository
  readonly invitationTokenRepository: IInvitationTokenRepository
  readonly containerInvitationService: IContainerInvitationService
  readonly invitationService: InvitationService
  readonly projectRepository: ProjectRepository
  readonly userProfileRepository: UserProfileRepository
  readonly containerService: ContainerServiceMap
  readonly containerRequestService: IContainerRequestService
  readonly functionService: FunctionService
  readonly userCollaboratorRepository: UserCollaboratorRepository
  readonly projectMementoRepository: ProjectMementoRepository
  readonly projectSummaryRepository: ProjectSummaryRepository
  readonly containerRequestRepository: ContainerRequestRepository
  readonly submissionRepository: ISubmissionRepository
  readonly submissionService: ISubmissionService
  readonly discourseService: DiscourseService | null
  readonly jwksClient: JWKSClient
  readonly iamTokenVerifier: IAMTokenVerifier
  readonly pressroomService: IPressroomService
  readonly shacklesService: IShacklesService
  readonly manuscriptRepository: IManuscriptRepository
  readonly manuscriptNotesRepository: ManuscriptNoteRepository
  readonly externalFileRepository: ExternalFileRepository
  readonly correctionRepository: CorrectionRepository
  readonly snapshotRepository: SnapshotRepository
  readonly templateRepository: TemplateRepository

  /**
   * WARNING: internal method.
   *
   * We need to await promises (Database initialization), which cannot be done
   * in a constructor.
   *
   * This constructor should only be called by the DIContainer.init() method.
   */
  constructor (
    readonly userBucket: Database,
    readonly dataBucket: Database,
    readonly appStateBucket: Database,
    readonly derivedDataBucket: Database,
    readonly discussionsBucket: Database,
    readonly enableActivityTracking: boolean
  ) {
    this.userCollaboratorRepository = new UserCollaboratorRepository(BucketKey.DerivedData, this.derivedDataBucket)
    this.projectMementoRepository = new ProjectMementoRepository(
      BucketKey.DerivedData,
      this.derivedDataBucket
    )
    this.projectSummaryRepository = new ProjectSummaryRepository(
      BucketKey.DerivedData,
      this.derivedDataBucket
    )
    this.applicationRepository = new MemorizingClientApplicationRepository(new ClientApplicationRepository(this.userBucket), 60)
    this.server = new Server(this.userBucket)
    this.userRepository = new UserRepository(this.userBucket)
    this.userTokenRepository = new UserTokenRepository(this.userBucket)
    this.userEmailRepository = new UserEmailRepository(this.userBucket)
    this.singleUseTokenRepository = new SingleUseTokenRepository(this.userBucket)
    this.invitationTokenRepository = new InvitationTokenRepository(this.userBucket)
    this.collaborationsRepository = new CollaborationsRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.emailService = new EmailService(config.email, config.AWS)
    this.userEventRepository = new UserEventRepository(this.userBucket)
    this.activityTrackingService = new UserActivityTrackingService(this.userEventRepository, this.enableActivityTracking)
    this.userStatusRepository = new UserStatusRepository(this.userBucket)
    this.syncService = new SyncService(this.userStatusRepository)
    this.userRegistrationService = new UserRegistrationService(
      this.userRepository,
      this.userEmailRepository,
      this.emailService,
      this.singleUseTokenRepository,
      this.activityTrackingService,
      this.userStatusRepository,
      this.syncService
    )
    this.projectRepository = new ProjectRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.userProfileRepository = new UserProfileRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.invitationRepository = new InvitationRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.containerInvitationRepository = new ContainerInvitationRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.containerRequestRepository = new ContainerRequestRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.submissionRepository = new SubmissionRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.submissionService = new SubmissionService(
      this.submissionRepository
    )
    this.manuscriptRepository = new ManuscriptRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.manuscriptNotesRepository = new ManuscriptNoteRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.externalFileRepository = new ExternalFileRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.correctionRepository = new CorrectionRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.snapshotRepository = new SnapshotRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.templateRepository = new TemplateRepository(
      BucketKey.Data,
      this.dataBucket
    )
    this.userService = new UserService(
      this.userRepository,
      this.singleUseTokenRepository,
      this.activityTrackingService,
      this.userStatusRepository,
      this.userTokenRepository,
      this.invitationRepository,
      this.containerInvitationRepository,
      this.containerRequestRepository,
      this.emailService,
      this.syncService,
      this.userProfileRepository,
      this.projectRepository,
      this.projectMementoRepository,
      this.userCollaboratorRepository
    )
    this.containerService = {
      [ContainerType.project]: new ContainerService(
        ContainerType.project,
        this.userRepository,
        this.userService,
        this.activityTrackingService,
        this.userStatusRepository,
        this.projectRepository,
        this.containerInvitationRepository,
        this.emailService,
        this.manuscriptRepository,
        this.manuscriptNotesRepository,
        this.externalFileRepository,
        this.correctionRepository,
        this.snapshotRepository,
        this.templateRepository
      )}
    this.containerInvitationService = new ContainerInvitationService(
        this.userRepository,
        this.userProfileRepository,
        this.emailService,
        this.containerService[ContainerType.project],
        this.containerInvitationRepository,
        this.invitationTokenRepository,
        this.activityTrackingService
      )
    this.invitationService = new InvitationService(
      this.userRepository,
      this.userProfileRepository,
      this.emailService,
      this.invitationRepository,
      this.collaborationsRepository,
      this.activityTrackingService,
      this.userRegistrationService
    )
    this.containerRequestService = new ContainerRequestService(
      this.containerRequestRepository,
      this.userProfileRepository,
      this.userRepository,
      this.containerService[ContainerType.project],
      this.emailService
    )
    this.authService = new AuthService(
      this.userRepository,
      this.userTokenRepository,
      this.userEmailRepository,
      this.userProfileRepository,
      this.emailService,
      this.singleUseTokenRepository,
      this.activityTrackingService,
      this.syncService,
      this.userStatusRepository,
      this.invitationService,
      this.containerInvitationService
    )
    this.functionService = new FunctionService(
      this.userBucket,
      this.dataBucket,
      this.appStateBucket,
      this.derivedDataBucket,
      this.discussionsBucket
    )
    this.discourseService = config.discourse ? new DiscourseService(config.discourse) : null
    this.jwksClient = jwksClientRSA({
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 60 * 1000, // 10h in ms
      strictSsl: true,
      rateLimit: true,
      jwksRequestsPerMinute: 1,
      jwksUri: `${config.IAM.authServerURL}/api/oidc/jwk.json`
    }) as any
    this.iamTokenVerifier = new IAMTokenVerifier()
    this.pressroomService = new PressroomService(
      config.pressroom.baseurl,
      config.pressroom.apiKey
    )
    this.shacklesService = new ShacklesService(
      config.shackles.baseUrl
    )
  }

  /**
   * Initializes the container
   *
   * This method creates a Database instance and passes it to the
   * services/repositories.
   *
   * This method should be called once at app startup.
   *
   * The server is then retrieved from the container and bootstrapped.
   */
  static async init (enableActivityTracking: boolean = false, enableFunctionService = false) {
    if (DIContainer._sharedContainer !== null) {
      throw new ContainerReinitializationError()
    }
    const userBucket = new Database(config.DB, BucketKey.User)

    // no loading of database models needed from this bucket (no Ottoman models are mapped there).
    const dataBucket = new Database(config.DB, BucketKey.Data)
    const appStateBucket = new Database(config.DB, BucketKey.AppState)
    const derivedDataBucket = new Database(config.DB, BucketKey.DerivedData)
    const discussionsBucket = new Database(config.DB, BucketKey.Discussions)

    // do NOT parallelise these. Deferred PRIMARY index creation appears buggy in CB.
    await userBucket.loadDatabaseModels()
    await dataBucket.loadDatabaseModels()
    await appStateBucket.loadDatabaseModels()
    await derivedDataBucket.loadDatabaseModels()

    DIContainer._sharedContainer = new DIContainer(
      userBucket,
      dataBucket,
      appStateBucket,
      derivedDataBucket,
      discussionsBucket,
      enableActivityTracking
    )

    // log.debug('_sharedContainer is set successfully.')

    /* istanbul ignore else */
    if (config.DB.initializeContents) {
      log.debug(`Initializing contents`)

      await userBucket.ensureSecondaryIndicesExist()
      log.debug(`User bucket secondary indices ensured.`)
      await dataBucket.ensureSecondaryIndicesExist()
      log.debug(`Data bucket secondary indices ensured.`)

      const initActions = [
        DIContainer._sharedContainer.pushDesignDocuments(),
        DIContainer._sharedContainer.applicationRepository.ensureApplicationsExist(config.apps && config.apps.knownClientApplications || []),
        DIContainer._sharedContainer.createBucketAdministrators()]
      if (enableFunctionService) {
        log.debug(`Synchronizing functions`)

        initActions.concat([
          DIContainer._sharedContainer.functionService.synchronize(BucketKey.Data)])

        log.debug(`Synchronized functions`)
      }

      await Promise.all(initActions)
    }
    return DIContainer._sharedContainer
  }

  public async createBucketAdministrators (): Promise<void> {
    await Promise.all(Object.values(BucketKey)
    .filter(key => (key !== BucketKey.User && key !== BucketKey.AppState)) // the user bucket is not featured in the Sync Gateway.
    .map(key => this.syncService.createGatewayAdministrator(`${config.DB.buckets[key]}_admin`, config.DB.bucketAdminPassword, key, ['*'], [])))
    log.debug('Bucket administrators created successfully.')
  }

  public bucketForKey (bucketKey: BucketKey): Database | null {
    switch (bucketKey) {
      case BucketKey.User:
        return this.userBucket
      case BucketKey.Data:
        return this.dataBucket
      case BucketKey.AppState:
        return this.appStateBucket
      case BucketKey.DerivedData:
        return this.derivedDataBucket
      case BucketKey.Discussions:
        return this.discussionsBucket
      default:
        return null
    }
  }

  public async pushDesignDocuments (): Promise<void> {
    await Promise.all(this.databaseViewManagers.map(x => x.pushDesignDocument()))
    log.debug('Design documents pushed successfully.')
  }

  public static isDatabaseViewManager (obj: any): obj is IDatabaseViewManager {
    return obj && obj.buildViews != null && obj.pushDesignDocument != null
  }

  public static isRepositoryLike (obj: any): obj is RepositoryLike {
    return obj && obj.create != null && obj.documentType != null
  }

  public static isSGRepositoryLike (obj: any): obj is SGRepositoryLike {
    return obj && obj.create != null && obj.objectType != null
  }

  public get databaseViewManagers (): ReadonlyArray<IDatabaseViewManager> {
    const viewManagers = (Object as any).values(this).filter(DIContainer.isDatabaseViewManager)
    const viewManagerSet: Set<IDatabaseViewManager> = new Set(viewManagers)
    return Array.from(viewManagerSet)
  }

  public get repositories (): RepositoryLike[] {
    const repositories = (Object as any).values(this).filter(DIContainer.isRepositoryLike)
    const repositorySet: Set<RepositoryLike> = new Set(repositories)
    return Array.from(repositorySet)
  }

  public get gatewayRepositories (): SGRepositoryLike[] {
    const repositories = (Object as any).values(this).filter(DIContainer.isSGRepositoryLike)
    const repositorySet: Set<SGRepositoryLike> = new Set(repositories)
    return Array.from(repositorySet)
  }
}
