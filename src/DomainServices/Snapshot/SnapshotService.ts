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
import prisma from '../../DataAccess/prismaClient'
import { ISnapshotService } from './ISnapshotService'

export class SnapshotService implements ISnapshotService {
  async listSnapshotLabels(documentID: string): Promise<Maybe<SnapshotLabel[]>> {
    const found = await prisma.manuscriptSnapshot.findMany({
      where: {
        doc_id: documentID,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    })
    return { data: found }
  }
  async getSnapshot(snapshotID: string): Promise<Maybe<ManuscriptSnapshot>> {
    const found = await prisma.manuscriptSnapshot.findUnique({
      where: {
        id: snapshotID,
      },
    })
    if (!found) {
      return { err: 'Snapshot not found', code: 404 }
    }
    return { data: found }
  }
  async saveSnapshot(payload: SaveSnapshotModel): Promise<Maybe<ManuscriptSnapshot>> {
    const { docID, snapshot, name } = payload
    const saved = await prisma.manuscriptSnapshot.create({
      data: {
        snapshot,
        doc_id: docID,
        name,
      },
    })
    return { data: saved }
  }
  async deleteSnapshot(snapshotID: string): Promise<Maybe<ManuscriptSnapshot>> {
    const deleted = await prisma.manuscriptSnapshot.delete({
      where: {
        id: snapshotID,
      },
    })
    return { data: deleted }
  }

  async deleteAllManuscriptSnapshots(documentID: string): Promise<number> {
    const { count } = await prisma.manuscriptSnapshot.deleteMany({
      where: {
        doc_id: documentID,
      },
    })
    return count
  }
}
