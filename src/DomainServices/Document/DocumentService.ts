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
import { ManuscriptDoc } from '@prisma/client'

import type {
  ICreateDocRequest,
  IUpdateDocument,
  ManuscriptDocWithSnapshots,
} from '../../../types/quarterback/doc'
import prisma from '../../DataAccess/prismaClient'
import {
  CreateDocumentError,
  DeleteDocumentError,
  MissingDocumentError,
  UpdateDocumentError,
} from '../../Errors'
import { IDocumentService } from './IDocumentService'

export class DocumentService implements IDocumentService {
  async findDocumentVersion(documentID: string): Promise<number | null> {
    const found = await prisma.manuscriptDoc.findFirst({
      where: {
        manuscript_model_id: documentID,
      },
      select: {
        version: true,
      },
    })
    if (!found) {
      throw new MissingDocumentError(documentID)
    }
    return found.version
  }
  async findDocument(documentID: string): Promise<ManuscriptDoc> {
    const found = await prisma.manuscriptDoc.findUnique({
      where: {
        manuscript_model_id: documentID,
      },
    })
    if (!found) {
      throw new MissingDocumentError(documentID)
    }
    return found
  }
  async findDocumentWithSnapshot(documentID: string): Promise<ManuscriptDocWithSnapshots> {
    const found = await prisma.manuscriptDoc.findUnique({
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
  async createDocument(
    payload: ICreateDocRequest,
    userID: string
  ): Promise<ManuscriptDocWithSnapshots> {
    const saved = await prisma.manuscriptDoc.create({
      data: {
        manuscript_model_id: payload.manuscript_model_id,
        user_model_id: userID,
        project_model_id: payload.project_model_id,
        doc: payload.doc,
        version: 0,
      },
    })
    if (!saved) {
      throw new CreateDocumentError(payload.manuscript_model_id)
    }
    return { ...saved, snapshots: [] }
  }
  async updateDocument(
    documentID: string,
    payload: IUpdateDocument
  ): Promise<ManuscriptDoc> {
    const saved = await prisma.manuscriptDoc.update({
      data: payload,
      where: {
        manuscript_model_id: documentID,
      },
    })
    if (!saved) {
      throw new UpdateDocumentError(documentID)
    }
    return saved
  }
  async deleteDocument(documentID: string): Promise<ManuscriptDoc> {
    const deleted = await prisma.manuscriptDoc.delete({
      where: {
        manuscript_model_id: documentID,
      },
    })
    if (!deleted) {
      throw new DeleteDocumentError(documentID)
    }
    return deleted
  }
}
