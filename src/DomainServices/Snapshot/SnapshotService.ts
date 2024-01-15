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
import prisma from '../../DataAccess/prismaClient'
import { CreateSnapshotError, DeleteSnapshotError, MissingSnapshotError } from '../../Errors'
import { ISnapshotService } from './ISnapshotService'

export class SnapshotService implements ISnapshotService {
  async listSnapshotLabels(documentID: string): Promise<SnapshotLabel[]> {
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
    return found
  }
  async getSnapshot(snapshotID: string): Promise<ManuscriptSnapshot> {
    const found = await prisma.manuscriptSnapshot.findUnique({
      where: {
        id: snapshotID,
      },
    })
    if (!found) {
      throw new MissingSnapshotError(snapshotID)
    }
    return found
  }
  async saveSnapshot(payload: SaveSnapshotModel): Promise<ManuscriptSnapshot> {
    const { docID, snapshot, name } = payload
    const saved = await prisma.manuscriptSnapshot.create({
      data: {
        snapshot,
        doc_id: docID,
        name,
      },
    })
    if (!saved) {
      throw new CreateSnapshotError(docID)
    }
    return saved
  }
  async deleteSnapshot(snapshotID: string): Promise<ManuscriptSnapshot> {
    const deleted = await prisma.manuscriptSnapshot.delete({
      where: {
        id: snapshotID,
      },
    })
    if (!deleted) {
      throw new DeleteSnapshotError(snapshotID)
    }
    return deleted
  }
}
