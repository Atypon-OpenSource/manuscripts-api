/*!
 * © 2023 Atypon Systems LLC
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

import { ManuscriptSnapshot } from '@prisma/client'

export type Snapshot = {
  doc_id: string
  snapshot: string
  id: string
  createdAt: number
}

export type SnapshotLabel = Pick<ManuscriptSnapshot, 'id' | 'name' | 'createdAt'>

export type SaveSnapshotRequest = {
  docID: string
  name: string
}
export type SaveSnapshotResponse = {
  snapshot: ManuscriptSnapshot
}
export type SaveSnapshotModel = SaveSnapshotRequest & { snapshot: any }
export type SnapshotLabelResult = {
  id: string
  name: string
  createdAt: number
}
export const DOI_UPDATED_LABEL = 'DOI updated'
