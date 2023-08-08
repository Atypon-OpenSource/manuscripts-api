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

import { config } from '../Config/Config'
import { BucketKey } from '../Config/ConfigurationTypes'
import applyMiddleware from '../DataAccess/applyMiddleware'
import { ClientApplicationRepository } from '../DataAccess/ClientApplicationRepository/ClientApplicationRepository'
import { CollaborationsRepository } from '../DataAccess/CollaborationsRepository/CollaborationsRepository'
import { ContainerInvitationRepository } from '../DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { ContainerRequestRepository } from '../DataAccess/ContainerRequestRepository/ContainerRequestRepository'
import { IClientApplicationRepository } from '../DataAccess/Interfaces/IClientApplicationRepository'
import { ICollaborationsRepository } from '../DataAccess/Interfaces/ICollaborationsRepository'
import { IInvitationTokenRepository } from '../DataAccess/Interfaces/IInvitationTokenRepository'
import { IManuscriptRepository } from '../DataAccess/Interfaces/IManuscriptRepository'
import { RepositoryLike, SGRepositoryLike } from '../DataAccess/Interfaces/IndexedRepository'
import { ISingleUseTokenRepository } from '../DataAccess/Interfaces/ISingleUseTokenRepository'
import { IUserEmailRepository } from '../DataAccess/Interfaces/IUserEmailRepository'
import { IUserEventRepository } from '../DataAccess/Interfaces/IUserEventRepository'
import { IUserRepository } from '../DataAccess/Interfaces/IUserRepository'
import { IUserStatusRepository } from '../DataAccess/Interfaces/IUserStatusRepository'
import { IUserTokenRepository } from '../DataAccess/Interfaces/IUserTokenRepository'
import { InvitationRepository } from '../DataAccess/InvitationRepository/InvitationRepository'
import { InvitationTokenRepository } from '../DataAccess/InvitationTokenRepository/InvitationTokenRepository'
import { ManuscriptNoteRepository } from '../DataAccess/ManuscriptNoteRepository/ManuscriptNoteRepository'
import { ManuscriptRepository } from '../DataAccess/ManuscriptRepository/ManuscriptRepository'
import { ProjectRepository } from '../DataAccess/ProjectRepository/ProjectRepository'
import { SingleUseTokenRepository } from '../DataAccess/SingleUseTokenRepository/SingleUseTokenRepository'
import { SQLDatabase } from '../DataAccess/SQLDatabase'
import { TemplateRepository } from '../DataAccess/TemplateRepository/TemplateRepository'
import { UserCollaboratorRepository } from '../DataAccess/UserCollaboratorRepository/UserCollaboratorRepository'
import { UserEmailRepository } from '../DataAccess/UserEmailRepository/UserEmailRepository'
import { UserEventRepository } from '../DataAccess/UserEventRepository/UserEventRepository'
import { UserProfileRepository } from '../DataAccess/UserProfileRepository/UserProfileRepository'
import { UserRepository } from '../DataAccess/UserRepository/UserRepository'
import { UserStatusRepository } from '../DataAccess/UserStatusRepository/UserStatusRepository'
import { UserTokenRepository } from '../DataAccess/UserTokenRepository/UserTokenRepository'
import { AuthService } from '../DomainServices/Auth/AuthService'
import { IAuthService } from '../DomainServices/Auth/IAuthService'
import { ContainerService } from '../DomainServices/Container/ContainerService'
import { ContainerRequestService } from '../DomainServices/ContainerRequest/ContainerRequestService'
import { IContainerRequestService } from '../DomainServices/ContainerRequest/IContainerRequestService'
import { EmailService } from '../DomainServices/Email/EmailService'
import { ExpirationService } from '../DomainServices/Expiration/ExpirationService'
import { ContainerInvitationService } from '../DomainServices/Invitation/ContainerInvitationService'
import { IContainerInvitationService } from '../DomainServices/Invitation/IContainerInvitationService'
import { InvitationService } from '../DomainServices/Invitation/InvitationService'
import { IPressroomService } from '../DomainServices/Pressroom/IPressroomService'
import { PressroomService } from '../DomainServices/Pressroom/PressroomService'
import { ProjectService } from '../DomainServices/ProjectService'
import { IQuarterbackService } from '../DomainServices/Quarterback/IQuarterbackService'
import { QuarterbackService } from '../DomainServices/Quarterback/QuarterbackService'
import { IUserRegistrationService } from '../DomainServices/Registration/IUserRegistrationService'
import { UserRegistrationService } from '../DomainServices/Registration/UserRegistrationService'
import { ISGService } from '../DomainServices/SG/ISGService'
import { SGService } from '../DomainServices/SG/SGService'
import { ISyncService } from '../DomainServices/Sync/ISyncService'
import { SyncService } from '../DomainServices/Sync/SyncService'
import { IUserService } from '../DomainServices/User/IUserService'
import { UserService } from '../DomainServices/User/UserService'
import { UserActivityTrackingService } from '../DomainServices/UserActivity/UserActivityTrackingService'
import { IServer } from '../Server/IServer'
import { Server } from '../Server/Server'

export class UninitializedContainerError extends Error {
  constructor() {
    super()
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ContainerReinitializationError extends Error {
  constructor() {
    super()
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class DIContainer {
  private static _sharedContainer: DIContainer | null = null

  static get sharedContainer(): DIContainer {
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
  readonly expirationService: ExpirationService
  readonly syncService: ISyncService
  readonly sgService: ISGService
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
  readonly userCollaboratorRepository: UserCollaboratorRepository
  readonly containerService: ContainerService
  readonly projectService: ProjectService
  readonly containerRequestService: IContainerRequestService
  readonly containerRequestRepository: ContainerRequestRepository
  readonly pressroomService: IPressroomService
  readonly quarterback: IQuarterbackService
  readonly manuscriptRepository: IManuscriptRepository
  readonly manuscriptNotesRepository: ManuscriptNoteRepository
  readonly templateRepository: TemplateRepository

  /**
   * WARNING: internal method.
   *
   * We need to await promises (SQLDatabase initialization), which cannot be done
   * in a constructor.
   *
   * This constructor should only be called by the DIContainer.init() method.
   */
  constructor(
    readonly userBucket: SQLDatabase,
    readonly dataBucket: SQLDatabase,
    readonly enableActivityTracking: boolean
  ) {
    this.userCollaboratorRepository = new UserCollaboratorRepository(
      BucketKey.User,
      this.userBucket
    )
    this.applicationRepository = new ClientApplicationRepository(this.userBucket)
    this.server = new Server(this.userBucket)
    this.userRepository = new UserRepository(this.userBucket)
    this.userTokenRepository = new UserTokenRepository(this.userBucket)
    this.userEmailRepository = new UserEmailRepository(this.userBucket)
    this.singleUseTokenRepository = new SingleUseTokenRepository(this.userBucket)
    this.invitationTokenRepository = new InvitationTokenRepository(this.userBucket)
    this.collaborationsRepository = new CollaborationsRepository(BucketKey.Project, this.dataBucket)
    this.emailService = new EmailService(config.email, {})
    this.userEventRepository = new UserEventRepository(this.userBucket)
    this.activityTrackingService = new UserActivityTrackingService(
      this.userEventRepository,
      this.enableActivityTracking
    )
    this.userStatusRepository = new UserStatusRepository(this.userBucket)
    this.userProfileRepository = new UserProfileRepository(BucketKey.Project, this.dataBucket)
    this.syncService = new SyncService(this.userStatusRepository, this.userProfileRepository)
    this.sgService = new SGService()
    this.userRegistrationService = new UserRegistrationService(
      this.userRepository,
      this.userEmailRepository,
      this.emailService,
      this.singleUseTokenRepository,
      this.activityTrackingService,
      this.userStatusRepository,
      this.syncService
    )
    this.projectRepository = new ProjectRepository(BucketKey.Project, this.dataBucket)
    this.invitationRepository = new InvitationRepository(BucketKey.Project, this.dataBucket)
    this.containerInvitationRepository = new ContainerInvitationRepository(
      BucketKey.Project,
      this.dataBucket
    )
    this.containerRequestRepository = new ContainerRequestRepository(
      BucketKey.Project,
      this.dataBucket
    )
    this.manuscriptRepository = new ManuscriptRepository(BucketKey.Project, this.dataBucket)
    this.manuscriptNotesRepository = new ManuscriptNoteRepository(
      BucketKey.Project,
      this.dataBucket
    )
    this.templateRepository = new TemplateRepository(BucketKey.Project, this.dataBucket)
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
      this.userCollaboratorRepository
    )
    this.containerService = new ContainerService(
      this.userRepository,
      this.userService,
      this.activityTrackingService,
      this.userStatusRepository,
      this.projectRepository,
      this.containerInvitationRepository,
      this.emailService,
      this.manuscriptRepository,
      this.manuscriptNotesRepository,
      this.templateRepository
    )
    this.projectService = new ProjectService(
      this.projectRepository,
      this.manuscriptRepository,
      this.templateRepository,
      this.userRepository
    )
    this.containerInvitationService = new ContainerInvitationService(
      this.userRepository,
      this.userProfileRepository,
      this.emailService,
      this.containerService,
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
      this.containerService,
      this.emailService
    )
    this.authService = new AuthService(
      this.userRepository,
      this.userTokenRepository,
      this.userProfileRepository,
      this.activityTrackingService,
      this.syncService,
      this.userStatusRepository
    )
    this.expirationService = new ExpirationService(
      this.userEventRepository,
      this.userTokenRepository,
      this.invitationRepository,
      this.invitationTokenRepository,
      this.containerInvitationRepository
    )
    this.pressroomService = new PressroomService(config.pressroom.baseurl, config.pressroom.apiKey)
    this.quarterback = new QuarterbackService(config.quarterback.baseurl, config.quarterback.apiKey)
  }

  /**
   * Initializes the container
   *
   * This method creates a SQLDatabase instance and passes it to the
   * services/repositories.
   *
   * This method should be called once at app startup.
   *
   * The server is then retrieved from the container and bootstrapped.
   */
  static async init(enableActivityTracking = false) {
    if (DIContainer._sharedContainer !== null) {
      throw new ContainerReinitializationError()
    }
    const userBucket = new SQLDatabase(config.DB, BucketKey.User)

    // no loading of database models needed from this bucket (no Ottoman models are mapped there).
    const dataBucket = new SQLDatabase(config.DB, BucketKey.Project)

    // do NOT parallelise these. Deferred PRIMARY index creation appears buggy in CB.
    await userBucket.loadDatabaseModels()
    await dataBucket.loadDatabaseModels()

    applyMiddleware()

    DIContainer._sharedContainer = new DIContainer(userBucket, dataBucket, enableActivityTracking)

    await DIContainer._sharedContainer.applicationRepository.ensureApplicationsExist(
      (config.apps && config.apps.knownClientApplications) || []
    )

    return DIContainer._sharedContainer
  }

  public bucketForKey(bucketKey: BucketKey): SQLDatabase {
    switch (bucketKey) {
      case BucketKey.User:
        return this.userBucket
      case BucketKey.Project:
        return this.dataBucket
      default:
        return this.dataBucket
    }
  }

  public static isRepositoryLike(obj: any): obj is RepositoryLike {
    return obj && obj.create != null && obj.documentType != null
  }

  public static isSGRepositoryLike(obj: any): obj is SGRepositoryLike {
    return obj && obj.create != null && obj.objectType != null
  }

  public get repositories(): RepositoryLike[] {
    const repositories = (Object as any).values(this).filter(DIContainer.isRepositoryLike)
    const repositorySet: Set<RepositoryLike> = new Set(repositories)
    return Array.from(repositorySet)
  }

  public get gatewayRepositories(): SGRepositoryLike[] {
    const repositories = (Object as any).values(this).filter(DIContainer.isSGRepositoryLike)
    const repositorySet: Set<SGRepositoryLike> = new Set(repositories)
    return Array.from(repositorySet)
  }
}
