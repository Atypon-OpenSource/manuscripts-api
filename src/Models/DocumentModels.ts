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
import { ManuscriptDoc, Prisma } from '@prisma/client'
import { Response } from 'express'

import { SnapshotLabel } from './SnapshotModel'

export type Doc = Record<string, any>

export type ManuscriptDocWithSnapshots = ManuscriptDoc & {
  snapshots: SnapshotLabel[]
}

export type GetDocumentResponse = ManuscriptDocWithSnapshots
export type CreateDoc = {
  manuscript_model_id: string
  project_model_id: string
  doc: Doc
}

export type Client = {
  id: number
  res: Response
}
export type StepsData = {
  steps: unknown[]
  clientIDs: number[]
  version: number
}

export type UpdateDocument = {
  doc?: Doc
  version?: number
  steps?: Prisma.JsonValue[]
} & ({ doc: Doc } | { version: number } | { steps: Prisma.JsonValue[] })
