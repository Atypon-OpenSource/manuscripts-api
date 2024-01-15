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
  IUpdateDocumentRequest,
  ManuscriptDocWithSnapshots,
} from '../../../types/quarterback/doc'

export interface IDocumentService {
  findDocumentVersion(id: string): Promise<number | null>
  findDocument(id: string): Promise<ManuscriptDoc>
  findDocumentWithSnapshot(DocumentID: string): Promise<ManuscriptDocWithSnapshots>
  createDocument(payload: ICreateDocRequest, userID: string): Promise<ManuscriptDocWithSnapshots>
  updateDocument(documentID: string, payload: IUpdateDocumentRequest): Promise<ManuscriptDoc>
  deleteDocument(documentID: string): Promise<ManuscriptDoc>
}
