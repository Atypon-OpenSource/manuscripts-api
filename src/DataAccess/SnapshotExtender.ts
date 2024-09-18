/*!
 * © 2024 Atypon Systems LLC
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

import { Prisma, PrismaClient } from '@prisma/client'

import { MissingRecordError, MissingSnapshotError } from '../Errors'
import { PrismaErrorCodes } from '../Models/RepositoryModels'
import { SaveSnapshotModel } from '../Models/SnapshotModel'

export class SnapshotExtender {
  readonly SNAPSHOT_MODEL = 'manuscriptSnapshot'
  private extensions: ReturnType<typeof this.buildExtensions>

  constructor(private readonly prisma: PrismaClient) {}

  getExtension() {
    this.extensions = this.buildExtensions()
    return this.extend()
  }
  private buildExtensions() {
    return {
      listSnapshotLabels: this.listSnapshotLabels,
      getSnapshot: this.getSnapshot,
      saveSnapshot: this.saveSnapshot,
      deleteSnapshot: this.deleteSnapshot,
      deleteAllManuscriptSnapshots: this.deleteAllManuscriptSnapshots,
      getMostRecentSnapshot: this.getMostRecentSnapshot,
    }
  }

  private extend() {
    return Prisma.defineExtension({
      name: this.SNAPSHOT_MODEL,
      model: {
        [this.SNAPSHOT_MODEL]: this.extensions,
      },
    })
  }

  private listSnapshotLabels = async (documentID: string) => {
    const found = await this.prisma.manuscriptSnapshot.findMany({
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

  private getSnapshot = async (snapshotID: string) => {
    const found = await this.prisma.manuscriptSnapshot.findUnique({
      where: {
        id: snapshotID,
      },
    })
    if (!found) {
      throw new MissingSnapshotError(snapshotID)
    }
    return found
  }

  private getMostRecentSnapshot = async (documentID: string) => {
    const found = await this.prisma.manuscriptSnapshot.findFirst({
      where: {
        doc_id: documentID,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    if (!found) {
      throw new MissingSnapshotError(documentID)
    }
    return found
  }

  private saveSnapshot = async (payload: SaveSnapshotModel) => {
    const { docID, snapshot, name } = payload
    const saved = await this.prisma.manuscriptSnapshot.create({
      data: {
        snapshot,
        doc_id: docID,
        name,
      },
    })
    return saved
  }

  private deleteSnapshot = async (snapshotID: string) => {
    try {
      const deleted = await this.prisma.manuscriptSnapshot.delete({
        where: {
          id: snapshotID,
        },
      })
      return deleted
    } catch (error) {
      if (error.code === PrismaErrorCodes.RecordMissing) {
        throw new MissingRecordError(snapshotID)
      }
      throw error
    }
  }

  private deleteAllManuscriptSnapshots = async (documentID: string) => {
    const { count } = await this.prisma.manuscriptSnapshot.deleteMany({
      where: {
        doc_id: documentID,
      },
    })
    return count
  }
}
