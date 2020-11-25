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

import { TemplatesController } from '../../../../../../src/Controller/V1/Templates/TemplatesController'

describe('TemplatesController - create', () => {
  test('should execute TemplatesController', async () => {
    const templatesController: TemplatesController = new TemplatesController()
    const output = await templatesController.fetchPublishedTemplates()
    expect(output).toBeTruthy()
  })
})
