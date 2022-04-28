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

import { ProjectRepository } from '../../../../../src/DataAccess/ProjectRepository/ProjectRepository'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { MethodNotAllowedError } from '../../../../../src/Errors'

describe('ProjectRepository - update', () => {
  xtest('should not allow the user to use update', () => {
    const repository = new ProjectRepository(BucketKey.Project, {} as any)

    return expect(
      repository.update('id', {} as Project, {})
    ).rejects.toThrowError(MethodNotAllowedError)
  })
})
