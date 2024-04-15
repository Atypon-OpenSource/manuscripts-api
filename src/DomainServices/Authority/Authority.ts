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
import { Prisma } from '@prisma/client'
import { Step } from 'prosemirror-transform'

import type { History, IReceiveSteps, ModifiedStep } from '../../../types/quarterback/authority'
import { DocumentRepository } from '../../DataAccess/DocumentRepository/DocumentRepository'
import prisma from '../../DataAccess/prismaClient'
import { VersionMismatchError } from '../../Errors'
export class Authority {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async receiveSteps(documentID: string, receiveSteps: IReceiveSteps): Promise<History> {
    return prisma.$transaction(async (tx) => {
      const found = await this.documentRepository.findDocument(documentID, tx)
      this.checkVersion(found.version, receiveSteps.version)
      const { doc, modifiedSteps } = this.applyStepsToDocument(
        receiveSteps.steps,
        found.doc,
        receiveSteps.clientID.toString()
      )
      await this.documentRepository.updateDocument(
        documentID,
        {
          doc: doc,
          version: receiveSteps.version + receiveSteps.steps.length,
          steps: found.steps.concat(modifiedSteps),
        },
        tx
      )
      return {
        steps: receiveSteps.steps,
        clientIDs: Array(receiveSteps.steps.length).fill(receiveSteps.clientID),
        version: receiveSteps.version + receiveSteps.steps.length,
      }
    })
  }

  public async getEvents(documentID: string, versionID: number): Promise<History> {
    const found = await this.documentRepository.findDocument(documentID)
    const startIndex = found.steps.length - (found.version - versionID)
    const steps = found.steps.slice(startIndex)
    const clientIDs = steps
      .filter((step): step is { clientID: string } => typeof step === 'object' && step !== null)
      .map((step) => parseInt(step.clientID))

    return {
      doc: found.doc,
      steps: this.hydrateSteps(steps),
      clientIDs,
      version: found.version,
    }
  }

  private checkVersion(docVersion: number, version: number): void {
    if (version != docVersion) {
      throw new VersionMismatchError(docVersion)
    }
  }
  private applyStepsToDocument(
    jsonSteps: Prisma.JsonObject[],
    document: Prisma.JsonValue,
    clientID: string
  ) {
    const steps = this.hydrateSteps(jsonSteps)
    const modifiedSteps: ModifiedStep[] = []
    let pmDocument = schema.nodeFromJSON(document)
    for (let i = 0; i < steps.length; i++) {
      pmDocument = steps[i].apply(pmDocument).doc || pmDocument
      modifiedSteps.push({ ...jsonSteps[i], clientID })
    }
    return { doc: pmDocument.toJSON(), modifiedSteps }
  }

  private hydrateSteps(jsonSteps: Prisma.JsonValue[]): Step[] {
    return jsonSteps.map((step: Prisma.JsonValue) => Step.fromJSON(schema, step)) as Step[]
  }
}
