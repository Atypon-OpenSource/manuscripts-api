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

import { DocumentExtender } from '../DataAccess/DocumentExtender'
import { EventExtender } from '../DataAccess/EventExtender'
import { ProjectExtender } from '../DataAccess/ProjectExtender'
import { Repository } from '../DataAccess/Repository'
import { SnapshotExtender } from '../DataAccess/SnapshotExtender'
import { UserExtender } from '../DataAccess/UserExtender'

export type DB = typeof Repository.prototype.DB
export type DocumentClient = typeof Repository.prototype.documentClient
export type ProjectClient = typeof Repository.prototype.projectClient
export type UserClient = typeof Repository.prototype.userClient
export type SnapshotClient = typeof Repository.prototype.snapshotClient
export type EventClient = typeof Repository.prototype.eventClient
export type DocumentExtension = ReturnType<typeof DocumentExtender.prototype.getExtension>
export type SnapshotExtension = ReturnType<typeof SnapshotExtender.prototype.getExtension>
export type UserExtension = ReturnType<typeof UserExtender.prototype.getExtension>
export type ProjectExtension = ReturnType<typeof ProjectExtender.prototype.getExtension>
export type EventExtension = ReturnType<typeof EventExtender.prototype.getExtension>

export type Extender =
  | DocumentExtender
  | SnapshotExtender
  | EventExtender
  | ProjectExtender
  | UserExtender

export type Extension =
  | DocumentExtension
  | SnapshotExtension
  | EventExtension
  | ProjectExtension
  | UserExtension

export type ExtensionMap = {
  DocumentExtender: DocumentExtension
  SnapshotExtender: SnapshotExtension
  EventExtender: EventExtension
  ProjectExtender: ProjectExtension
  UserExtender: UserExtension
}
export type GetExtension<T extends Extender> = T extends keyof ExtensionMap
  ? ExtensionMap[T]
  : never

export enum PrismaErrorCodes {
  RecordMissing = 'P2025',
}
