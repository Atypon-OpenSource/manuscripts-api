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

import { ManuscriptDoc, Prisma } from '@prisma/client'

import type {
  ICreateDoc,
  IUpdateDocument,
  ManuscriptDocWithSnapshots,
} from '../../../types/quarterback/doc'

export interface IDocumentService {
  findDocumentVersion(id: string, tx?: Prisma.TransactionClient): Promise<number | null>
  findDocument(id: string, tx?: Prisma.TransactionClient): Promise<ManuscriptDoc>
  findDocumentWithSnapshot(
    DocumentID: string,
    tx?: Prisma.TransactionClient
  ): Promise<ManuscriptDocWithSnapshots>
  createDocument(
    payload: ICreateDoc,
    userID: string,
    tx?: Prisma.TransactionClient
  ): Promise<ManuscriptDocWithSnapshots>
  updateDocument(
    documentID: string,
    payload: IUpdateDocument,
    tx?: Prisma.TransactionClient
  ): Promise<ManuscriptDoc>
  deleteDocument(documentID: string, tx?: Prisma.TransactionClient): Promise<ManuscriptDoc>
}
