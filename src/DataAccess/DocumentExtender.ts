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

import { ManuscriptDoc, Prisma, PrismaClient } from '@prisma/client'

import { MissingDocumentError, MissingRecordError } from '../Errors'
import { CreateDoc, UpdateDocument } from '../Models/DocumentModels'
import { PrismaErrorCodes } from '../Models/RepositoryModels'

export class DocumentExtender {
  readonly DOCUMENT_MODEL = 'manuscriptDoc'
  private extensions: ReturnType<typeof this.buildExtensions>

  constructor(private readonly prisma: PrismaClient) {}

  getExtension() {
    this.extensions = this.buildExtensions()
    return this.extend()
  }
  private buildExtensions() {
    return {
      findDocument: this.findDocument,
      findDocumentWithSnapshot: this.findDocumentWithSnapshot,
      createDocument: this.createDocument,
      updateDocument: this.updateDocument,
      deleteDocument: this.deleteDocument,
    }
  }

  private extend() {
    return Prisma.defineExtension({
      name: this.DOCUMENT_MODEL,
      model: {
        [this.DOCUMENT_MODEL]: this.extensions,
      },
    })
  }
  private findDocument = async (documentID: string): Promise<ManuscriptDoc> => {
    const found = await this.prisma.manuscriptDoc.findUnique({
      where: {
        manuscript_model_id: documentID,
      },
    })
    if (!found) {
      throw new MissingDocumentError(documentID)
    }
    return found
  }

  private findDocumentWithSnapshot = async (documentID: string) => {
    const found = await this.prisma.manuscriptDoc.findUnique({
      where: {
        manuscript_model_id: documentID,
      },
      include: {
        snapshots: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    })
    if (!found) {
      throw new MissingDocumentError(documentID)
    }
    return found
  }
  private createDocument = async (payload: CreateDoc, userID: string) => {
    const saved = await this.prisma.manuscriptDoc.create({
      data: {
        manuscript_model_id: payload.manuscript_model_id,
        user_model_id: userID,
        project_model_id: payload.project_model_id,
        schema_version: payload.schema_version,
        doc: payload.doc,
        version: 0,
      },
    })

    return { ...saved, snapshots: [] }
  }

  private updateDocument = async (documentID: string, payload: UpdateDocument) => {
    try {
      const saved = await this.prisma.manuscriptDoc.update({
        data: payload,
        where: {
          manuscript_model_id: documentID,
        },
      })
      return saved
    } catch (error) {
      if (error.code === PrismaErrorCodes.RecordMissing) {
        throw new MissingRecordError(documentID)
      }
      throw error
    }
  }

  private deleteDocument = async (documentID: string) => {
    try {
      const deleted = await this.prisma.manuscriptDoc.delete({
        where: {
          manuscript_model_id: documentID,
        },
      })
      return deleted
    } catch (error) {
      if (error.code === PrismaErrorCodes.RecordMissing) {
        throw new MissingRecordError(documentID)
      }
      throw error
    }
  }
}
