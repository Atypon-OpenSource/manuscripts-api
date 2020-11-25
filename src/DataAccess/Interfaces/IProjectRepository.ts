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

import { Project, ManuscriptTemplate, Model } from '@manuscripts/manuscripts-json-schema'

import { KeyValueRepository } from './KeyValueRepository'
import { ProjectLike } from './Models'
import { PatchProject } from '../../Models/ProjectModels'

/**
 * Manages project persistent storage operations.
 */
export interface IProjectRepository
  extends KeyValueRepository<
    ProjectLike,
    ProjectLike,
    ProjectLike,
    PatchProject
  > {
  /**
   * Gets all the projects associated to a user
   * @param id user's id
   */
  getUserProjects (id: string): Promise<Project[]>
  /**
   * Removes the project and contained resource.
   * @param id project's id
   * @param syncSession user's sync session
   */
  removeWithAllResources (id: string, syncSession: string): Promise<void>

  /**
   * Gets ManuscriptTemplates from project
   * @param id project's id
   */
  findTemplatesInProject (id: string): Promise<ManuscriptTemplate[]>

  /**
   * Gets Models from ManuscriptTemplates
   * @param projectId project's id
   * @param templateId template's id
   */
  findModelsInTemplate (projectId: String, templateId: String): Promise<Model[]>
}

/**
 * The data required to delete a document related to a project.
 */
export interface DocumentIdentifyingMetadata {
  id: string
  rev: string
}
