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

import { Manuscript } from '@manuscripts/json-schema'

export const validManuscript: Manuscript = {
  _id: 'MPManuscript:valid-manuscript-id-1',
  objectType: 'MPManuscript',
  title: 'A Test Manuscript',
  bundle: 'MPBundle:foo',
  createdAt: 1603157299,
  updatedAt: 1603157220,
  priority: 1,
  containerID: 'MPProject:valid-project-id-2',
}

export const validManuscript1: Manuscript = {
  _id: 'MPManuscript:valid-manuscript-id-2',
  objectType: 'MPManuscript',
  title: 'A Test Manuscript',
  bundle: 'MPBundle:foo',
  createdAt: 1603157299,
  updatedAt: 1603157220,
  priority: 1,
  containerID: 'MPProject:valid-project-id-11',
}
