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

import { ExternalFileLike } from '../../../src/DataAccess/Interfaces/Models'

export const externalFileList: ExternalFileLike[] = []

externalFileList.push({
  _id: 'MPExternalFile:valid-externalFile-id-1',
  filename: 'supplemental-file.docx',
  objectType: 'MPExternalFile',
  designation: 'supplemental',
  containerID: 'MPProject:valid-project-id-2',
  MIME: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  displayName: 'Supplemental file',
  manuscriptID: 'MPManuscript:valid-manuscript-id-1',
  sessionID: 'test',
  publicUrl: 'http://exampleUrl.com/path'
})

externalFileList.push({
  _id: 'MPExternalFile:valid-externalFile-id-2',
  filename: 'supplemental-file.docx',
  objectType: 'MPExternalFile',
  designation: 'supplemental',
  containerID: 'MPProject:valid-project-id-2',
  MIME: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  displayName: 'Supplemental file',
  manuscriptID: 'MPManuscript:valid-manuscript-id-1',
  sessionID: 'test',
  publicUrl: 'http://exampleUrl.com/path'
})
