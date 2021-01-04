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

export const manuscriptNoteList: ManuscriptNoteLike[] = []

manuscriptNoteList.push({
  _id: 'MPManuscriptNote:valid-note-id-1',
  containerID: 'MPProject:valid-project-id-11',
  contents: 'test data',
  manuscriptID: 'MPManuscript:valid-manuscript-id-1',
  objectType: 'MPManuscriptNote',
  sessionID: 'CAB15C5D-D178-4792-88F0-892BB1E29A79',
  target: 'MPManuscript:valid-manuscript-id-1',
  source: 'DASHBOARD',
  contributions: [
    {
      _id: 'MPContribution:52A07FF8-2E76-4AA3-8C4B-B65BC3211DBD',
      objectType: 'MPContribution',
      profileID: 'MPUserProfile:e5cef85828fdfb0af2e8a561389754028101431f',
      timestamp: 1605918508
    }
  ]
})
