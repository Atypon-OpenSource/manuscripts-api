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

import { ClientApplication } from '../../../src/Models/ClientApplicationModels'
import { ClientApplicationRepository } from '../../../src/DataAccess/ClientApplicationRepository/ClientApplicationRepository'

export const validApplication: ClientApplication = {
  _id: 'Application|9a9090d9-6f95-420c-b903-543f32b5140f',
  _type: ClientApplicationRepository.prototype.documentType,
  name: 'Valid Application',
  secret: 'Valid secret'
}
