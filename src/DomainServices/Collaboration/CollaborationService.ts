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

import type { History, IReceiveStepsRequest } from '../../../types/quarterback/collaboration'
import type { Doc, IUpdateDocument } from '../../../types/quarterback/doc'
import { DIContainer } from '../../DIContainer/DIContainer'
import { VersionMismatchError } from '../../Errors'

export class CollaborationService {
  public async receiveSteps(documentID: string, payload: IReceiveStepsRequest): Promise<History> {
    const document = await DIContainer.sharedContainer.documentService.findDocument(documentID)
    const updatedDoc = this.applyStepsToDocument(payload.steps, document)
    const version = document.version ?? 0
    const newVersion = version + payload.steps.length
    if (version != payload.version) {
      throw new VersionMismatchError(version)
    }
    await this.updateDocument(documentID, { doc: updatedDoc, version: newVersion })
    await this.createDocumentHistory(
      documentID,
      payload.steps,
      newVersion,
      payload.clientID.toString()
    )
    return {
      steps: payload.steps,
      clientIDs: Array(payload.steps.length).fill(parseInt(payload.clientID)),
      version: version + payload.steps.length,
    }
  }

  private applyStepsToDocument(jsonSteps: Prisma.JsonValue[], document: Doc): Promise<Doc> {
    const steps = hydrateSteps(jsonSteps)
    let pmDocument = schema.nodeFromJSON(document.doc)
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
    const histories =
      await DIContainer.sharedContainer.documentHistoryService.findDocumentHistories(
        documentID,
        fromVersion
      )
    return this.combineHistories(histories)
  }
  public async getHistoriesFromVersion(documentID: string, versionID: number): Promise<History> {
    const mergedHistories = await this.getCombinedHistories(documentID, versionID)
    const version = await DIContainer.sharedContainer.documentService.findDocumentVersion(
      documentID
    )
    return {
      steps: hydrateSteps(mergedHistories.steps) || [],
      clientIDs: mergedHistories.clientIDs || [],
      version: version ?? 0,
    }
  }

  private async createDocumentHistory(
    documentID: string,
    steps: Prisma.JsonValue[],
    version: number,
    clientID: string
  ) {
    await DIContainer.sharedContainer.documentHistoryService.createDocumentHistory(
      documentID,
      steps,
      version,
      clientID
    )
  }
  private async updateDocument(documentID: string, payload: IUpdateDocument) {
    await DIContainer.sharedContainer.documentService.updateDocument(documentID, payload)
  }
}

const hydrateSteps = (jsonSteps: Prisma.JsonValue[]): Step[] => {
  return jsonSteps.map((step: Prisma.JsonValue) => Step.fromJSON(schema, step)) as Step[]
}
