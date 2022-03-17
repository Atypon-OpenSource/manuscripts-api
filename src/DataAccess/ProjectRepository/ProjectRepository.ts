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

import { Project } from '@manuscripts/manuscripts-json-schema'

import { IProjectRepository } from '../Interfaces/IProjectRepository'
import { ProjectLike } from '../Interfaces/Models'
import { PatchProject } from '../../Models/ProjectModels'
import { ContainerRepository } from '../ContainerRepository/ContainerRepository'

export class ProjectRepository
  extends ContainerRepository<Project, ProjectLike, PatchProject>
  implements IProjectRepository
{
  public get objectType(): string {
    return 'MPProject'
  }

  /*public async update (
    _id: string,
    _updatedDocument: ProjectLike,
  ): Promise<Project> {
    throw new MethodNotAllowedError('ProjectRepository', 'update')
  }*/
}
