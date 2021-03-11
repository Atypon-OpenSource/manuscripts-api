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

import { CorrectionLike } from '../../../src/DataAccess/Interfaces/Models'

export const correctionList: CorrectionLike[] = []

correctionList.push({
  _id: 'MPCorrection:valid-correction-id-1',
  containerID: 'MPProject:valid-project-id-2',
  manuscriptID: 'MPManuscript:valid-manuscript-id-1',
  sessionID: 'test',
  objectType: 'MPCorrection',
  snapshotID: 'MPSnapshot:test-snap',
  status: 'accepted',
  commitChangeID: 'MPCommit:123-123'
})

correctionList.push({
  _id: 'MPCorrection:valid-correction-id-2',
  containerID: 'MPProject:valid-project-id-2',
  manuscriptID: 'MPManuscript:valid-manuscript-id-1',
  sessionID: 'test',
  objectType: 'MPCorrection',
  snapshotID: 'MPSnapshot:test-snap',
  status: 'accepted',
  commitChangeID: 'MPCommit:123-123'
})

correctionList.push({
  _id: 'MPCorrection:valid-correction-id-3',
  containerID: 'MPProject:valid-project-id-2',
  manuscriptID: 'MPManuscript:valid-manuscript-id-1',
  sessionID: 'test',
  objectType: 'MPCorrection',
  snapshotID: 'MPSnapshot:test-snap',
  status: 'rejected',
  commitChangeID: 'MPCommit:123-123'
})

correctionList.push({
  _id: 'MPCorrection:valid-correction-id-4',
  containerID: 'MPProject:valid-project-id-2',
  manuscriptID: 'MPManuscript:valid-manuscript-id-1',
  sessionID: 'test',
  objectType: 'MPCorrection',
  snapshotID: 'MPSnapshot:test-snap',
  status: 'proposed',
  commitChangeID: 'MPCommit:123-123'
})

correctionList.push({
  _id: 'MPCorrection:valid-correction-id-5',
  containerID: 'MPProject:valid-project-id-2',
  manuscriptID: 'MPManuscript:valid-manuscript-id-1',
  sessionID: 'test',
  objectType: 'MPCorrection',
  snapshotID: 'MPSnapshot:test-snap',
  status: 'accepted',
  commitChangeID: 'MPCommit:123-123'
})
