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

import { schema } from '@manuscripts/transform'
import { ManuscriptDocHistory, Prisma } from '@prisma/client'
import { Step } from 'prosemirror-transform'

import type { History, IReceiveSteps } from '../../../types/quarterback/collaboration'
import prisma from '../../DataAccess/prismaClient'
import { VersionMismatchError } from '../../Errors'
import { IDocumentService } from '../Document/IDocumentService'
import { DocumentHistoryService } from '../DocumentHistory/DocumentHistoryService'
export class CollaborationService {
  constructor(
    private readonly documentService: IDocumentService,
    private readonly documentHistoryService: DocumentHistoryService
  ) {}

  private readonly DEFAULT_DOC_VERSION = 0

  public async receiveSteps(documentID: string, payload: IReceiveSteps): Promise<History> {
    return prisma.$transaction(
      async (tx) => {
        const found = await this.documentService.findDocument(documentID, tx)
        this.validateDocumentVersionForUpdate(found.version || 0, payload.version)
        const updatedDoc = this.applyStepsToDocument(payload.steps, found.doc)
        await this.documentService.updateDocument(
          documentID,
          {
            doc: updatedDoc,
            version: payload.version + payload.steps.length,
          },
          tx
        )
        await this.documentHistoryService.createDocumentHistory(
          documentID,
          payload.steps,
          payload.version + payload.steps.length,
          payload.clientID.toString(),
          tx
        )
        return {
          steps: payload.steps,
          clientIDs: Array(payload.steps.length).fill(payload.clientID),
          version: payload.version + payload.steps.length,
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  }

  private validateDocumentVersionForUpdate(docVersion: number, version: number): void {
    if (version != docVersion) {
      throw new VersionMismatchError(docVersion)
    }
  }
  private applyStepsToDocument(jsonSteps: Prisma.JsonValue[], document: Prisma.JsonValue) {
    const steps = this.hydrateSteps(jsonSteps)
    let pmDocument = schema.nodeFromJSON(document)
    steps.forEach((step: Step) => {
      pmDocument = step.apply(pmDocument).doc || pmDocument
    })
    return pmDocument.toJSON()
  }

  private combineHistories(histories: ManuscriptDocHistory[]) {
    const steps: Prisma.JsonValue[] = []
    const clientIDs: number[] = []
    for (const history of histories) {
      steps.push(...history.steps)
      clientIDs.push(...Array(history.steps.length).fill(parseInt(history.client_id)))
    }
    return {
      steps,
      clientIDs,
    }
  }
  private async getCombinedHistories(documentID: string, fromVersion = 0) {
    const histories = await this.documentHistoryService.findDocumentHistories(
      documentID,
      fromVersion
    )
    return this.combineHistories(histories)
  }
  public async getHistoriesFromVersion(documentID: string, versionID: number): Promise<History> {
    const mergedHistories = await this.getCombinedHistories(documentID, versionID)
    const version = await this.documentService.findDocumentVersion(documentID)
    return {
      steps: this.hydrateSteps(mergedHistories.steps) || [],
      clientIDs: mergedHistories.clientIDs || [],
      version: version ?? this.DEFAULT_DOC_VERSION,
    }
  }
  private hydrateSteps(jsonSteps: Prisma.JsonValue[]): Step[] {
    return jsonSteps.map((step: Prisma.JsonValue) => Step.fromJSON(schema, step)) as Step[]
  }
}
