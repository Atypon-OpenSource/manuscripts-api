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

import { ContainerRole, Container } from '../../Models/ContainerModels'
import { User } from '../../Models/UserModels'
import { ManuscriptNote } from '@manuscripts/manuscripts-json-schema'

export interface IContainerService {
  /**
   * Create container.
   * @param token User's token
   */
  containerCreate (token: string, _id: string | null): Promise<Container>

  /**
   * Adds user to container.
   * @returns a boolean indicating the success or the failure of adding the user.
   */
  addContainerUser (
    containerId: string,
    role: ContainerRole,
    userId: string,
    addingUser: User | null
  ): Promise<boolean>

  /**
   * Updates user role in a container.
   */
  updateContainerUser (
    containerId: string,
    role: ContainerRole | null,
    user: User
  ): Promise<void>

  /**
   * Manage the role of a user in the container.
   * @param token Managing user's token.
   * @param containerId The id of the container.
   * @param managedUserId The id of the managed user.
   * @param newRole The new role of a user, could be null for deleting the user from the container.
   */
  manageUserRole (
    token: string,
    containerId: string,
    managedUserId: string,
    newRole: ContainerRole | null
  ): Promise<void>

  /**
   * Checks if the user is in the container.
   */
  isContainerUser (container: Container, userId: string): boolean

  /**
   * Gets the role of a user.
   */
  getUserRole (container: Container, userId: string): ContainerRole | null

  /**
   * Gets the container.
   */
  getContainer (containerId: string): Promise<Container>

  /**
   * Checks if the user is an owner.
   */
  isOwner (container: Container, userId: string): boolean

  /**
   * Gets an archive (ZIP file) of the container
   * See https://gitlab.com/mpapp-private/pressroom#manuscripts-project-bundle-format-aka-manuproj
   */
  getArchive (
    userID: string,
    containerID: string,
    manuscriptID: string | null,
    token: string | null,
    options: { getAttachments: boolean; onlyIDs: boolean; includeExt: boolean}
  ): Promise<Blob>

  checkUserContainerAccess (userID: string, containerID: string): Promise<boolean>
  /**
   * Gets access token for specified scope.
   * @param scope The name of the specified scope.
   * @param containerID The identifier of the container.
   */
  accessToken (
    userID: string,
    scope: string,
    containerID: string
  ): Promise<void>
  /**
   * Ensures if the role is valid.
   */
  ensureValidRole (role: ContainerRole): void

  /**
   * Creates a Manuscript Note
   * @param containerId the ID of the container
   * @param manuscriptID the ID of the manuscript
   * @param content the note content
   * @param userID the id of the user
   * @param target if supplied it note will act as a reply and the value of the target should be a note ID
   */
  createManuscriptNote (containerId: string,
                       manuscriptID: string,
                       content: string,
                       userID: string,
                       target?: string
  ): Promise<ManuscriptNote>

  /**
   * returns a list of ManuscriptNotes
   * @param containerId the ID of the container
   * @param manuscriptID the ID of the manuscript
   * @param userID the id of the user
   */
  getProductionNotes (
    containerId: string,
    manuscriptID: string,
    userID: string
  ): Promise<ManuscriptNote[]>
}

export interface ArchiveOptions {
  getAttachments?: boolean
  onlyIDs?: boolean
  allowOrphanedDocs?: boolean
  includeExt: boolean | true
}
