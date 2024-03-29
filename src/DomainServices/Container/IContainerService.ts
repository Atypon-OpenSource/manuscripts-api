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

import { Manuscript, ManuscriptNote, Model } from '@manuscripts/json-schema'

import { Container, ContainerRole } from '../../Models/ContainerModels'
import { User } from '../../Models/UserModels'

export interface ArchiveOptions {
  getAttachments?: boolean
  onlyIDs?: boolean
  includeExt: boolean | true
  types?: string[]
}

export interface IContainerService {
  /**
   * Create container.
   * @param token User's token
   * @param _id projectId
   */
  createContainer(token: string, _id: string | null): Promise<Container>

  /**
   * Deletes the container with all resources.
   */
  deleteContainer(containerId: string): Promise<void>

  /**
   * Adds user to container.
   * @returns a boolean indicating the success or the failure of adding the user.
   */
  addContainerUser(containerId: string, role: ContainerRole, userId: string): Promise<boolean>

  /**
   * Updates user role in a container.
   */
  updateContainerUser(containerId: string, role: ContainerRole | null, user: User): Promise<void>

  /**
   * Manage the role of a user in the container.
   * @param containerId The id of the container.
   * @param managedUserId The id of the managed user.
   * @param newRole The new role of a user, could be null for deleting the user from the container.
   */
  manageUserRole(
    containerId: string,
    managedUserId: { userId?: string; connectUserId?: string },
    newRole: ContainerRole | null
  ): Promise<void>

  /**
   * Gets the role of a user.
   */
  getUserRole(container: Container, userId: string): ContainerRole | null

  /**
   * Gets the container.
   */
  getContainer(containerId: string): Promise<Container>

  /**
   * Gets an archive (ZIP file) of the container
   * See https://gitlab.com/mpapp-private/pressroom#manuscripts-project-bundle-format-aka-manuproj
   */
  getArchive(
    containerID: string,
    manuscriptID: string | null,
    token: string | null,
    options: ArchiveOptions
  ): Promise<Buffer>

  loadProject(
    containerID: string,
    manuscriptID: string | null,
    options: ArchiveOptions
  ): Promise<Model[]>

  /**
   * Gets access token for specified scope.
   * @param userID User ID
   * @param scope The name of the specified scope.
   * @param containerID The identifier of the container.
   */
  accessToken(userID: string, scope: string, containerID: string): Promise<void>
  /**
   * Ensures if the role is valid.
   */
  ensureValidRole(role: ContainerRole): void

  /**
   * Creates a Manuscript
   * @param userId the ID of the user
   * @param containerID the ID of the container
   * @param manuscriptID the ID of the manuscript
   * @param templateId the ID of the template
   */
  createManuscript(
    userId: string,
    containerID: string,
    manuscriptID?: string,
    templateId?: string
  ): Promise<Manuscript>

  /**
   * Creates a Manuscript Note
   * @param containerId the ID of the container
   * @param manuscriptID the ID of the manuscript
   * @param content the note content
   * @param userId the ID of the User
   * @param source the source of the note (EDITOR, EMAIL, DASHBOARD)
   * @param target if supplied it note will act as a reply and the value of the target should be a note ID
   */
  createManuscriptNote(
    containerId: string,
    manuscriptID: string,
    content: string,
    userId: string,
    source: string,
    target?: string
  ): Promise<ManuscriptNote>

  /**
   * returns a list of ManuscriptNotes
   * @param containerId the ID of the container
   * @param manuscriptID the ID of the manuscript
   * @param userID the id of the user
   */
  getProductionNotes(
    containerId: string,
    manuscriptID: string,
    userID: string
  ): Promise<ManuscriptNote[]>
  /**
   * Adds createdAt, updatedAt, containerID, manuscriptID attributes
   * validates against schema
   * @param docs list of Models
   * @param containerID
   * @param manuscriptID
   * @return an array with validated objects
   */
  processManuscriptModels(docs: Model[], containerID: string, manuscriptID: string): Promise<any>
}
