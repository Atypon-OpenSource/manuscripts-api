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

import type {
  DocumentHistory,
  History,
  IReceiveStepsRequest,
} from '../../../types/quarterback/collaboration'
import type { Doc } from '../../../types/quarterback/doc'
import type { Maybe } from '../../../types/quarterback/utils'
import { DIContainer } from '../../DIContainer/DIContainer'

export class CollaborationService {
  async receiveSteps(documentID: string, payload: IReceiveStepsRequest): Promise<Maybe<History>> {
    const document = await DIContainer.sharedContainer.documentService.findDocument(documentID)
    if (!('data' in document)) {
      return { err: document.err, code: document.code }
    }
    const version = document.data.version ?? 0
    if (document.data.version != payload.version) {
      return {
        err: `Update denied, version is ${version}, and client version is ${payload.version}`,
        code: 409,
      }
    }
    const updatedDoc = await this.applyStepsToDocument(payload.steps, document)
    if (!('data' in updatedDoc)) {
      return { err: updatedDoc.err, code: updatedDoc.code }
    }
    const history = await DIContainer.sharedContainer.documentHistoryService.createDocumentHistory(
      documentID,
      payload.steps,
      version + payload.steps.length,
      payload.clientID.toString()
    )
    if (!('data' in history)) {
      return { err: history.err, code: history.code }
    }
    return {
      data: {
        steps: payload.steps,
        clientIDs: Array(payload.steps.length).fill(parseInt(payload.clientID)),
        version: version + payload.steps.length,
      },
    }
  }

  private async applyStepsToDocument(jsonSteps: Prisma.JsonValue[], document: Doc) {
    const steps = hydrateSteps(jsonSteps)
    let pmDocument = schema.nodeFromJSON(document.data.doc)
    steps.forEach((step: Step) => {
      pmDocument = step.apply(pmDocument).doc || pmDocument
    })
    return await DIContainer.sharedContainer.documentService.updateDocument(
      document.data.manuscript_model_id,
      { doc: pmDocument.toJSON(), version: document.data.version + steps.length }
    )
  }

  private combineHistories(histories: ManuscriptDocHistory[]) {
    let steps: Prisma.JsonValue[] = []
    let clientIDs: number[] = []
    for (const history of histories) {
      steps = steps.concat(history.steps)
      clientIDs = clientIDs.concat(Array(history.steps.length).fill(parseInt(history.client_id)))
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
    if (!histories.data) {
      return { err: histories.err, code: histories.code }
    }
    return { data: this.combineHistories(histories.data) }
  }
  async getCombinedHistoriesFromVersion(
    documentID: string,
    versionID: number
  ): Promise<Maybe<History>> {
    const mergedHistories = await this.getCombinedHistories(documentID, versionID)
    if (!mergedHistories.data) {
      return { err: mergedHistories.err, code: mergedHistories.code }
    }
    const found = await DIContainer.sharedContainer.documentService.findDocumentVersion(documentID)
    if (!('data' in found)) {
      return { err: found.err, code: found.code }
    }
    return {
      data: {
        steps: hydrateSteps(mergedHistories.data.steps),
        clientIDs: mergedHistories.data.clientIDs,
        version: found.data.version ?? 0,
      },
    }
  }

  async getDocumentHistory(documentID: string, fromVersion = 0): Promise<Maybe<DocumentHistory>> {
    const document = await DIContainer.sharedContainer.documentService.findDocument(documentID)
    if (!('data' in document)) {
      return { err: document.err, code: document.code }
    }
    const history = await this.getCombinedHistoriesFromVersion(documentID, fromVersion)
    if ('data' in history) {
      const initialData = {
        data: {
          ...history.data,
          doc: document.data.doc,
        },
      }
      return initialData
    }
    return defaultInitialData
  }
}

const hydrateSteps = (jsonSteps: Prisma.JsonValue[]): Step[] => {
  return jsonSteps.map((step: Prisma.JsonValue) => Step.fromJSON(schema, step)) as Step[]
}

const defaultInitialData = {
  data: {
    steps: [],
    clientIDs: [],
    version: 0,
    doc: undefined,
  },
}
