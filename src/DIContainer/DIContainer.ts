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
import { Repository } from '../DataAccess/Repository'
import { AuthenticationService } from '../DomainServices/AuthenticationService'
import { AuthorityService } from '../DomainServices/AuthorityService'
import { ConfigService } from '../DomainServices/ConfigService'
import { EventManager } from '../DomainServices/EventService'
import { PressroomService } from '../DomainServices/PressroomService'
import { ProjectService } from '../DomainServices/ProjectService'
import { QuarterbackService } from '../DomainServices/QuarterbackService'
import { RegisterationService } from '../DomainServices/RegisterationService'
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
  readonly pressroomService: PressroomService
  readonly quarterbackService: QuarterbackService
  readonly authenticationService: AuthenticationService
  readonly registerationService: RegisterationService
  readonly projectClient: ProjectClient
  readonly userClient: UserClient
  readonly snapshotClient: SnapshotClient
  readonly documentClient: DocumentClient
  readonly eventclient: EventClient
  readonly eventManager: EventManager

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

    this.pressroomService = new PressroomService(config.pressroom.baseurl, config.pressroom.apiKey)
    this.quarterbackService = new QuarterbackService()
    this.eventclient = repository.eventClient
    this.eventManager = new EventManager(this.eventclient)
    this.authenticationService = new AuthenticationService(repository.userClient)
    this.registerationService = new RegisterationService(repository.userClient, this.eventManager)
    this.configService = new ConfigService(config.data.path)
    this.authorityService = new AuthorityService(repository.DB)
    this.userService = new UserService(repository.userClient, repository.projectClient)
    this.projectClient = repository.projectClient
    this.documentClient = repository.documentClient
    this.snapshotClient = repository.snapshotClient
    this.userClient = repository.userClient
    //or we can send repo.DB?
    this.projectService = new ProjectService(
      repository.projectClient,
      repository.userClient,
      repository.snapshotClient,
      repository.documentClient,
      this.pressroomService,
      this.configService
    )

    // this.eventService = new EventService(this.eventRepo)
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
    const repository = new Repository()
    await repository.connectClient()
    DIContainer._sharedContainer = new DIContainer(repository)
    return DIContainer._sharedContainer
  }
}
