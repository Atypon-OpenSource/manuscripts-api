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

import { PrismaClient } from '@prisma/client'

import { config } from '../Config/Config'
import { DocumentExtender } from '../DataAccess/DocumentExtender'
import { EventExtender } from '../DataAccess/EventExtender'
import { ProjectExtender } from '../DataAccess/ProjectExtender'
import { Repository } from '../DataAccess/Repository'
import { SnapshotExtender } from '../DataAccess/SnapshotExtender'
import { UserExtender } from '../DataAccess/UserExtender'
import { AuthenticationService } from '../DomainServices/AuthenticationService'
import { AuthorityService } from '../DomainServices/AuthorityService'
import { ConfigService } from '../DomainServices/ConfigService'
import { DocumentService } from '../DomainServices/DocumentService'
import { EventManager } from '../DomainServices/EventService'
import { ProjectService } from '../DomainServices/ProjectService'
import { RegisterationService } from '../DomainServices/RegisterationService'
import { SocketsService } from '../DomainServices/SocketsService'
import { UserService } from '../DomainServices/UserService'
import {
  DocumentClient,
  EventClient,
  ProjectClient,
  SnapshotClient,
  UserClient,
} from '../Models/RepositoryModels'
import { IServer } from '../Server/IServer'
import { Server } from '../Server/Server'

const prisma = new PrismaClient()

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
  readonly projectService: ProjectService
  readonly authorityService: AuthorityService
  readonly userService: UserService
  readonly configService: ConfigService
  readonly documentService: DocumentService
  readonly authenticationService: AuthenticationService
  readonly registerationService: RegisterationService
  readonly projectClient: ProjectClient
  readonly userClient: UserClient
  readonly snapshotClient: SnapshotClient
  readonly documentClient: DocumentClient
  readonly eventclient: EventClient
  readonly eventManager: EventManager
  readonly socketsService: SocketsService

  /**
   * WARNING: internal method.
   *
   * We need to await promises (SQLDatabase initialization), which cannot be done
   * in a constructor.
   *
   * This constructor should only be called by the DIContainer.init() method.
   */
  constructor(readonly repository: Repository) {
    this.server = new Server()

    this.eventclient = repository.eventClient
    this.eventManager = new EventManager(this.eventclient)
    this.authenticationService = new AuthenticationService(repository.userClient)
    this.registerationService = new RegisterationService(repository.userClient, this.eventManager)
    this.configService = new ConfigService(config.data)
    this.authorityService = new AuthorityService(repository.DB)
    this.userService = new UserService(repository.userClient, repository.projectClient)
    this.projectClient = repository.projectClient
    this.documentClient = repository.documentClient
    this.snapshotClient = repository.snapshotClient
    this.userClient = repository.userClient
    this.projectService = new ProjectService(
      repository.projectClient,
      repository.userClient,
      repository.snapshotClient,
      repository.documentClient,
      this.configService
    )
    this.socketsService = new SocketsService()
    this.documentService = new DocumentService(this.socketsService)
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
  static async init() {
    if (DIContainer._sharedContainer !== null) {
      throw new ContainerReinitializationError()
    }
    const documentExtender = new DocumentExtender(prisma)
    const snapshotExtender = new SnapshotExtender(prisma)
    const eventExtender = new EventExtender(prisma)
    const projectExtender = new ProjectExtender(prisma)
    const userExtender = new UserExtender(prisma)
    const repository = new Repository(
      prisma,
      documentExtender,
      snapshotExtender,
      projectExtender,
      userExtender,
      eventExtender
    )
    await repository.connectClient()
    DIContainer._sharedContainer = new DIContainer(repository)
    return DIContainer._sharedContainer
  }
}
