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

import type { SaveSnapshotModel, SnapshotLabel } from '../../../types/quarterback/snapshot'
import type { Maybe } from '../../../types/quarterback/utils'

export interface ISnapshotService {
  listSnapshotLabels(documentID: string): Promise<Maybe<SnapshotLabel[]>>
  getSnapshot(snapshotID: string): Promise<Maybe<ManuscriptSnapshot>>
  saveSnapshot(payload: SaveSnapshotModel): Promise<Maybe<ManuscriptSnapshot>>
  deleteSnapshot(snapshotID: string): Promise<Maybe<ManuscriptSnapshot>>
  deleteAllManuscriptSnapshots(documentID: string): Promise<number>
}
