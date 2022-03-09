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
  Library,
  LibraryCollection,
  ObjectTypes,
  Project,
  UserProfile,
} from '@manuscripts/manuscripts-json-schema'

import { LibraryRepository } from '../DataAccess/LibraryRepository/LibraryRepository'
import { LibraryCollectionRepository } from '../DataAccess/LibraryCollectionRepository/LibraryCollectionRepository'
import { ProjectRepository } from '../DataAccess/ProjectRepository/ProjectRepository'
import { ContainerService } from '../DomainServices/Container/ContainerService'

export enum ContainerRole {
  Owner = 'Owner',
  Writer = 'Writer',
  Viewer = 'Viewer',
  Editor = 'Editor',
  Annotator = 'Annotator',
}

export interface InvitedUserData {
  email: string
  name?: string
}

export interface ContainerInvitationResponse {
  containerID: string | null
  message: string
}

export enum ContainerType {
  project = 'project',
  library = 'library',
  libraryCollection = 'libraryCollection',
}

export type Container = Project | Library | LibraryCollection

export type ContainerObjectType =
  | ObjectTypes.Project
  | ObjectTypes.Library
  | ObjectTypes.LibraryCollection

export type ContainerRepository =
  | ProjectRepository
  | LibraryRepository
  | LibraryCollectionRepository

export interface ContainerServiceMap {
  [k: string]: ContainerService
}

export interface PatchContainerInvitation {
  role?: ContainerRole
  message?: string
  acceptedAt?: number
  invitedUserID?: string
}

export interface PatchContainerRequest {
  userProfile?: UserProfile
  role?: ContainerRole
}
