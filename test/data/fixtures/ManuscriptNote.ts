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

import { ManuscriptNoteLike } from '../../../src/DataAccess/Interfaces/Models'

export const validNote1: ManuscriptNoteLike = {
  _id: 'MPManuscriptNote:valid-note-id-1',
  containerID: 'MPProject:valid-project-id-2',
  contents: 'test data',
  manuscriptID: 'MPManuscript:valid-manuscript-id-1',
  objectType: 'MPManuscriptNote',
  sessionID: 'CAB15C5D-D178-4792-88F0-892BB1E29A79',
  target: 'MPManuscript:valid-manuscript-id-1',
  source: 'DASHBOARD',
  contributions: []
}

export const validNote2: ManuscriptNoteLike = {
  _id: 'MPManuscriptNote:valid-note-id-2',
  containerID: 'MPProject:valid-project-id-1',
  contents: 'test data2',
  manuscriptID: 'MPManuscript:valid-manuscript-id-1',
  objectType: 'MPManuscriptNote',
  sessionID: 'CAB15C5D-D178-4792-88F0-892BB1E29A79',
  target: 'MPManuscriptNote:valid-note-id-1',
  source: 'DASHBOARD',
  contributions: []
}
