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

import { ManuscriptDocHistory, Prisma } from '@prisma/client'

import prisma from '../../DataAccess/prismaClient'
import { MissingDocumentHistoryError } from '../../Errors'
import { IDocumentHistoryService } from './IDocumentHistoryService'

export class DocumentHistoryService implements IDocumentHistoryService {
  async clearDocumentHistory(
    documentID: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<number> {
    const { count } = await tx.manuscriptDocHistory.deleteMany({
      where: {
        doc_id: documentID,
      },
    })

    return count
  }
  async createDocumentHistory(
    documentID: string,
    steps: Prisma.JsonValue[],
    version: number,
    clientID: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<ManuscriptDocHistory> {
    const saved = await tx.manuscriptDocHistory.create({
      data: {
        doc_id: documentID,
        steps: steps,
        version: version,
        client_id: clientID,
      },
    })
    return saved
  }
  async findLatestDocumentHistory(
    documentID: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<ManuscriptDocHistory> {
    const found = await tx.manuscriptDocHistory.findFirst({
      where: {
        doc_id: documentID,
      },
      orderBy: {
        version: 'desc',
      },
    })
    if (!found) {
      throw new MissingDocumentHistoryError(documentID)
    }
    return found
  }
  async findDocumentHistories(
    documentID: string,
    fromVersion = 0,
    tx: Prisma.TransactionClient = prisma
  ): Promise<ManuscriptDocHistory[]> {
    const found = await tx.manuscriptDocHistory.findMany({
      where: {
        doc_id: documentID,
        version: {
          gt: fromVersion,
        },
      },
      orderBy: {
        version: 'asc',
      },
    })
    return found
  }
}
