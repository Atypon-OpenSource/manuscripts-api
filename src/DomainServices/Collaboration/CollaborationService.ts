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
  IGetStepsFromVersionResponse,
  IListenRequestResponse,
  IReceiveStepsRequest,
  IReceiveStepsResponse,
} from '../../../types/quarterback/collaboration'
import type { Doc } from '../../../types/quarterback/doc'
import type { Maybe } from '../../../types/quarterback/utils'
import { DIContainer } from '../../DIContainer/DIContainer'
export class CollaborationService {
  async receiveSteps(
    documentID: string,
    payload: IReceiveStepsRequest
  ): Promise<Maybe<IReceiveStepsResponse>> {
    const document = await DIContainer.sharedContainer.documentService.findDocument(documentID)
    if (!('data' in document)) {
      return { err: 'Document not found', code: 404 }
    }
    const version = await this.getLatestDocumentHistoryVersion(documentID)
    if (version != payload.clientVersion) {
      return {
        err: `Update denied, version is ${version}, and client version is ${payload.clientVersion}`,
        code: 409,
      }
    }
    await this.applyStepsToDocument(payload.steps, document, version)
    await DIContainer.sharedContainer.documentHistoryService.createDocumentHistory(
      documentID,
      payload.steps,
      version + payload.steps.length,
      payload.clientID
    )
    return {
      data: {
        steps: payload.steps,
        clientIDs: Array(payload.steps.length).fill(payload.clientID),
        version: version + payload.steps.length,
      },
    }
  }

  private async applyStepsToDocument(
    jsonSteps: Prisma.JsonValue[],
    document: Doc,
    version: number
  ) {
    const steps = hydrateSteps(jsonSteps)
    let pmDocument = schema.nodeFromJSON(document.data.doc)
    steps.forEach((step: Step) => {
      pmDocument = step.apply(pmDocument).doc || pmDocument
    })
    const updatedVersion = version + steps.length
    await DIContainer.sharedContainer.documentService.updateDocument(
      document.data.manuscript_model_id,
      {
        doc: pmDocument.toJSON(),
      }
    )
    return updatedVersion
  }

  private mergeHistories(histories: ManuscriptDocHistory[]) {
    let steps: Prisma.JsonValue[] = []
    let clientIDs: string[] = []
    let version = 0
    for (const history of histories) {
      steps = steps.concat(history.steps)
      clientIDs = clientIDs.concat(Array(history.steps.length).fill(history.client_id))
      version = history.version > version ? history.version : version
    }
    return {
      steps: steps,
      clientIDs: clientIDs,
      version,
    }
  }
  private async getMergedHistories(documentID: string, fromVersion = 0) {
    const histories =
      await DIContainer.sharedContainer.documentHistoryService.findDocumentHistories(
        documentID,
        fromVersion
      )
    if (!histories.data) {
      return { err: 'History not found', code: 404 }
    }
    return { data: this.mergeHistories(histories.data) }
  }

  private async getLatestDocumentHistoryVersion(documentID: string): Promise<number> {
    const latestDocumentHistory =
      await DIContainer.sharedContainer.documentHistoryService.findLatestDocumentHistory(documentID)
    if ('data' in latestDocumentHistory) {
      return latestDocumentHistory.data.version
    }
    return 0
  }

  async getDocumentHistory(
    documentID: string,
    fromVersion = 0
  ): Promise<Maybe<IListenRequestResponse>> {
    const document = await DIContainer.sharedContainer.documentService.findDocument(documentID)
    if (!('data' in document)) {
      return { err: 'Document not found', code: 404 }
    }
    const mergedHistories = await this.getMergedHistories(documentID, fromVersion)
    return {
      data: {
        steps: hydrateSteps(mergedHistories.data?.steps || []),
        clientIDs: convertIDsToNumbers(mergedHistories.data?.clientIDs || []),
        version: mergedHistories.data?.version || 0,
        doc: document.data.doc || undefined,
      },
    }
  }
  async getDataFromVersion(
    documentID: string,
    versionID: string
  ): Promise<Maybe<IGetStepsFromVersionResponse>> {
    const mergedHistories = await this.getMergedHistories(documentID, parseInt(versionID))
    if (!mergedHistories.data) {
      return { err: 'History not found', code: 404 }
    }
    const steps = hydrateSteps(mergedHistories.data.steps)
    const clientIDs = convertIDsToNumbers(mergedHistories.data.clientIDs)
    return {
      data: {
        steps: steps,
        clientIDs: clientIDs,
        version: mergedHistories.data.version,
      },
    }
  }
}

const convertIDsToNumbers = (ids: string[]) => {
  const newIDs: number[] = []
  ids.forEach((id) => {
    newIDs.push(parseInt(id))
  })
  return newIDs
}
const hydrateSteps = (jsonSteps: Prisma.JsonValue[]): Step[] => {
  return jsonSteps.map((step: Prisma.JsonValue) => Step.fromJSON(schema, step)) as Step[]
}
