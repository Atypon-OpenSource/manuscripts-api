/*!
 * © 2024 Atypon Systems LLC
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

import {
  DocumentExtension,
  EventExtension,
  ProjectExtension,
  SnapshotExtension,
  UserExtension,
} from '../Models/RepositoryModels'
import { log } from '../Utilities/Logger'
import { DocumentExtender } from './DocumentExtender'
import { EventExtender } from './EventExtender'
import { ProjectExtender } from './ProjectExtender'
import { SnapshotExtender } from './SnapshotExtender'
import { UserExtender } from './UserExtender'

export class Repository {
  private readonly repository: ReturnType<typeof this.initRepository>
  private documentExtension: DocumentExtension
  private snapshotExtension: SnapshotExtension
  private projectExtension: ProjectExtension
  private userExtension: UserExtension
  private eventExtension: EventExtension

  constructor(
    private readonly prisma: PrismaClient,
    private readonly documentExtender: DocumentExtender,
    private readonly snapshotExtender: SnapshotExtender,
    private readonly projectExtender: ProjectExtender,
    private readonly userExtender: UserExtender,
    private readonly eventExtender: EventExtender
  ) {
    this.initExtensions()
    this.repository = this.initRepository()
  }

  public async connectClient() {
    await this.DB.$connect().catch(function (err: any) {
      log.error(`An error occurred while connecting to db`, err)
    })
  }

  public get DB() {
    return this.repository
  }
  private initExtensions() {
    this.documentExtension = this.documentExtender.getExtension()
    this.snapshotExtension = this.snapshotExtender.getExtension()
    this.projectExtension = this.projectExtender.getExtension()
    this.userExtension = this.userExtender.getExtension()
    this.eventExtension = this.eventExtender.getExtension()
  }
  private initRepository() {
    return this.prisma
      .$extends(this.documentExtension)
      .$extends(this.snapshotExtension)
      .$extends(this.projectExtension)
      .$extends(this.userExtension)
      .$extends(this.eventExtension)
  }

  public get documentClient() {
    return this.DB.manuscriptDoc
  }
  public get projectClient() {
    return this.DB.project
  }
  public get userClient() {
    return this.DB.user
  }
  public get snapshotClient() {
    return this.DB.manuscriptSnapshot
  }
  public get eventClient() {
    return this.DB.event
  }
}
