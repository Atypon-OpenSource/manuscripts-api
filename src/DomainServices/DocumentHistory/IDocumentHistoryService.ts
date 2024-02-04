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

import { ManuscriptDocHistory, Prisma } from '@prisma/client'

export interface IDocumentHistoryService {
  clearDocumentHistory(documentID: string, tx?: Prisma.TransactionClient): Promise<number>
  createDocumentHistory(
    documentID: string,
    steps: Prisma.JsonValue[],
    version: number,
    clientID: string,
    tx?: Prisma.TransactionClient
  ): Promise<ManuscriptDocHistory>
  findLatestDocumentHistory(
    documentID: string,
    tx?: Prisma.TransactionClient
  ): Promise<ManuscriptDocHistory>
  findDocumentHistories(
    documentID: string,
    fromVersion?: number,
    tx?: Prisma.TransactionClient
  ): Promise<ManuscriptDocHistory[]>
}
