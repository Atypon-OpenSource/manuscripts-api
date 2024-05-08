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

import { log } from '../Utilities/Logger'
import { DocumentExtender } from './DocumentExtender'
import { EventExtender } from './EventExtender'
import { ProjectExtender } from './ProjectExtender'
import { SnapshotExtender } from './SnapshotExtender'
import { UserExtender } from './UserExtender'

export class Repository {
  private readonly prisma: PrismaClient
  private readonly _documentExtension: ReturnType<typeof DocumentExtender.getExtension>
  private readonly _snapshotExtension: ReturnType<typeof SnapshotExtender.getExtension>
  private readonly _projectExtension: ReturnType<typeof ProjectExtender.getExtension>
  private readonly _userExtension: ReturnType<typeof UserExtender.getExtension>
  private readonly _eventExtension: ReturnType<typeof EventExtender.getExtension>

  private readonly _repository: ReturnType<typeof this.initRepository>

  constructor() {
    this.prisma = new PrismaClient()
    this._documentExtension = this.initDocumentRepository()
    this._snapshotExtension = this.initSnapshotRepository()
    this._projectExtension = this.initProjectRepository()
    this._userExtension = this.initUserRepository()
    this._eventExtension = this.initEventRepository()

    this._repository = this.initRepository()
  }

  public async connectClient() {
    await this.prisma.$connect().catch(function (err: any) {
      log.error(`An error occurred while connecting to db`, err)
    })
  }

  public get DB() {
    return this._repository
  }

  private initRepository() {
    return this.prisma
      .$extends(this._documentExtension)
      .$extends(this._snapshotExtension)
      .$extends(this._projectExtension)
      .$extends(this._userExtension)
      .$extends(this._eventExtension)
  }

  private initDocumentRepository() {
    return DocumentExtender.getExtension(this.prisma)
  }

  private initSnapshotRepository() {
    return SnapshotExtender.getExtension(this.prisma)
  }

  private initProjectRepository() {
    return ProjectExtender.getExtension(this.prisma)
  }

  private initUserRepository() {
    return UserExtender.getExtension(this.prisma)
  }

  private initEventRepository() {
    return EventExtender.getExtension(this.prisma)
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
  public get eventClient(){
    return this.DB.event
  }
}
export type DB = typeof Repository.prototype.DB
export type DocumentClient = typeof Repository.prototype.documentClient
export type ProjectClient = typeof Repository.prototype.projectClient
export type UserClient = typeof Repository.prototype.userClient
export type SnapshotClient = typeof Repository.prototype.snapshotClient
export type EventClient = typeof Repository.prototype.eventClient

export enum PrismaErrorCodes {
  RecordMissing = 'P2025',
}
