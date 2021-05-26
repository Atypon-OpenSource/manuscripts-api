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
  ManuscriptTemplate,
  Model
} from '@manuscripts/manuscripts-json-schema'

import { KeyValueRepository } from './KeyValueRepository'

/**
 * Manages container persistent storage operations.
 */
export interface IContainerRepository<Container, ContainerLike, PatchContainer>
  extends KeyValueRepository<
    Container,
    ContainerLike,
    ContainerLike,
    PatchContainer
  > {
  /**
   * Gets all the containers associated to a user
   * @param id user's id
   */
  getUserContainers (id: string): Promise<Container[]>
  /**
   * Removes the container and contained resource.
   * @param id container's id
   * @param syncSession user's sync session
   */
  removeWithAllResources (id: string, syncSession: string): Promise<void>

  /**
   * Gets ManuscriptTemplates from container
   * @param id container's id
   */
  findTemplatesInContainer (id: string): Promise<ManuscriptTemplate[]>

  /**
   * Gets Models from ManuscriptTemplates
   * @param containerId container's id
   * @param templateId template's id
   */
  findModelsInTemplate (
    containerId: String,
    templateId: String
  ): Promise<Model[]>
}

/**
 * The data required to delete a document related to a container.
 */
export interface DocumentIdentifyingMetadata {
  id: string
  rev: string
}
