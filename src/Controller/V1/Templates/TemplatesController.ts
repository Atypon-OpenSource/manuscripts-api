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

import { ITemplatesController } from './ITemplatesController'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { Project, Model } from '@manuscripts/manuscripts-json-schema'
import { ContainedBaseController } from '../../ContainedBaseController'
import { config } from '../../../Config/Config'

export class TemplatesController extends ContainedBaseController implements ITemplatesController {

  async fetchPublishedTemplates (): Promise<Model[]> {
    const userPublishedTemplate = await this.fetchUserPublishedTemplates()
    const projectPublishedTemplate = await this.fetchProjectsPublishedTemplates()

    const output: Model[] = userPublishedTemplate
    output.push(...projectPublishedTemplate)

    return output
  }

  async fetchUserPublishedTemplates (): Promise<Model[]> {
    const output = []
    const projects = await this.findUserProjects()
    for (const project of projects) {
      const templates = await DIContainer.sharedContainer.projectRepository.findTemplatesInContainer(project._id)
      for (const template of templates) {
        output.push(template)
        const templateItems = await DIContainer.sharedContainer.projectRepository.findModelsInTemplate(project._id, template._id)
        output.push(...templateItems)
      }
    }

    return output
  }

  async fetchProjectsPublishedTemplates (): Promise<Model[]> {
    const output = []
    const projects = await this.getSelectedProjects()
    for (const project of projects) {
      const templates = await DIContainer.sharedContainer.projectRepository.findTemplatesInContainer(project._id)
      for (const template of templates) {
        output.push(template)
        const templateItems = await DIContainer.sharedContainer.projectRepository.findModelsInTemplate(project._id, template._id)
        output.push(...templateItems)
      }
    }

    return output
  }

  public async findUserProjects (): Promise<Project[]> {
    const projects: any[] = []
    const allowedOwners = config.template.allowedOwners
    for (const owner of allowedOwners) {
      const userProject = await DIContainer.sharedContainer.projectRepository.getUserContainers(owner)
      projects.push(...userProject)
    }
    return projects
  }

  public async getSelectedProjects (): Promise<Project[]> {
    const projects: Project[] = []
    const projectIds = config.template.allowedProjects
    for (const projectId of projectIds) {
      const project = await DIContainer.sharedContainer.projectRepository.getById(projectId)
      if (project === null) {
        continue
      }
      projects.push(project)
    }
    return projects
  }
}
