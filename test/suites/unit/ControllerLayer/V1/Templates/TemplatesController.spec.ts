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

import '../../../../../utilities/dbMock'
import { TemplatesController } from '../../../../../../src/Controller/V1/Templates/TemplatesController'
import { validProject2 } from '../../../../../data/fixtures/projects'
import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('TemplatesController - fetchTemplates', () => {
  test('should execute TemplatesController', async () => {
    const prjectRepo: any = DIContainer.sharedContainer.projectRepository
    prjectRepo.getById = jest.fn((id) => {
      if (id === 'MPProject:valid-project-id-2') {
        return validProject2
      } else {
        return null
      }
    })
    prjectRepo.getUserContainers = jest.fn(() => [validProject2])
    prjectRepo.findModelsInTemplate = jest.fn(() => [validProject2])
    prjectRepo.findTemplatesInContainer = jest.fn(() => [{
      containerID: 'MPProject:valid-project-id-2',
      title: 'Valid Template Title',
      _id: 'MPManuscriptTemplate:valid-template-2',
      objectType: 'MPManuscriptTemplate'
    }])

    const templatesController: TemplatesController = new TemplatesController()
    const output = await templatesController.fetchPublishedTemplates()
    expect(output).toBeTruthy()
  })
})
