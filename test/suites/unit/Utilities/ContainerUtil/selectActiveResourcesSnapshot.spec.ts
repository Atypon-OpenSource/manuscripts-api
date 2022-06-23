/*!
 * © 2019 Atypon Systems LLC
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

import projectDump from '@manuscripts/examples/data/project-dump.json'
import { Model, ObjectTypes, Project } from '@manuscripts/manuscripts-json-schema'

import { selectActiveResources } from '../../../../../src/Utilities/ContainerUtils/selectActiveResources'
import projectDump2 from './../../../../data/fixtures/sample/project-dump-2.json'

interface ContainedModel extends Model {
  containerID: string
  manuscriptID?: string
  // [key: string]: any
}

const models = projectDump.data as Model[]

const project: Project = {
  _id: 'MPProject:1',
  objectType: ObjectTypes.Project,
  createdAt: 0,
  updatedAt: 0,
  owners: [],
  writers: [],
  viewers: [],
}

const manuscript = models.find((item) => item.objectType === ObjectTypes.Manuscript)

if (!manuscript) {
  throw new Error('Manuscript not found')
}

for (const item of models as ContainedModel[]) {
  item.containerID = project._id
  item.manuscriptID = manuscript._id
}

models.push(project)

describe('selectActiveResources', () => {
  it('Project dump', () => {
    const result = selectActiveResources(models)
    return expect(result).toMatchSnapshot()
  })

  it('Project dump 2', () => {
    const result = selectActiveResources(projectDump2)
    return expect(result).toMatchSnapshot()
  })
})
