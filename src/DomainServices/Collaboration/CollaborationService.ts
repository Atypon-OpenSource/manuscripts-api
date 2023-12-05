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
      return { err: 'Document not found', code: 404 }
    }
    const version =
      await DIContainer.sharedContainer.documentHistoryService.getLatestHistoryVersion(documentID)
    if (version != payload.version) {
      return {
        err: `Update denied, version is ${version}, and client version is ${payload.version}`,
        code: 409,
      }
    }
    await this.applyStepsToDocument(payload.steps, document)
    await DIContainer.sharedContainer.documentHistoryService.createDocumentHistory(
      documentID,
      payload.steps,
      version + payload.steps.length,
      payload.clientID.toString()
    )
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
    await DIContainer.sharedContainer.documentService.updateDocument(
      document.data.manuscript_model_id,
      { doc: pmDocument.toJSON() }
    )
  }

  private combineHistories(histories: ManuscriptDocHistory[]) {
    let steps: Prisma.JsonValue[] = []
    let clientIDs: number[] = []
    let version = 0
    for (const history of histories) {
      steps = steps.concat(history.steps)
      clientIDs = clientIDs.concat(Array(history.steps.length).fill(parseInt(history.client_id)))
      version = history.version > version ? history.version : version
    }
    return {
      steps,
      clientIDs,
      version,
    }
  }
  private async getCombinedHistories(documentID: string, fromVersion = 0) {
    const histories =
      await DIContainer.sharedContainer.documentHistoryService.findDocumentHistories(
        documentID,
        fromVersion
      )
    if (!histories.data) {
      return { err: 'History not found', code: 404 }
    }
    return { data: this.combineHistories(histories.data) }
  }
  async getCombinedHistoriesFromVersion(
    documentID: string,
    versionID: number
  ): Promise<Maybe<History>> {
    const mergedHistories = await this.getCombinedHistories(documentID, versionID)
    if (!mergedHistories.data) {
      return { err: 'History not found', code: 404 }
    }
    return {
      data: {
        steps: hydrateSteps(mergedHistories.data.steps),
        clientIDs: mergedHistories.data.clientIDs,
        version: mergedHistories.data.version,
      },
    }
  }

  async getDocumentHistory(documentID: string, fromVersion = 0): Promise<Maybe<DocumentHistory>> {
    const document = await DIContainer.sharedContainer.documentService.findDocument(documentID)
    if (!('data' in document)) {
      return { err: 'Document not found', code: 404 }
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
