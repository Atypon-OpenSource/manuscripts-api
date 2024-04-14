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
import type { IUpdateDocument } from '../../../types/quarterback/doc'
import prisma, { PrismaErrorCodes } from '../../DataAccess/prismaClient'
import { MissingDocumentError, MissingRecordError, VersionMismatchError } from '../../Errors'
import { IDocumentService } from '../Document/IDocumentService'

export class Authority {
  constructor(private readonly documentService: IDocumentService) {}

  public async receiveSteps(
    documentID: string,
    { version, clientID, steps }: IReceiveSteps
  ): Promise<History> {
    return prisma.$transaction(async (tx) => {
      const found = await this.transactionProvider(tx).findDocument(documentID)
      this.checkVersion(found.version, version)
      const { doc, modifiedSteps } = this.applyStepsToDocument(
        steps,
        found.doc,
        clientID.toString()
      )
      await this.transactionProvider(tx).updateDocument(documentID, {
        doc: doc,
        version: version + steps.length,
        steps: found.steps.concat(modifiedSteps),
      })
      return {
        steps,
        clientIDs: Array(steps.length).fill(clientID),
        version: version + steps.length,
      }
    })
  }

  public async getEvents(documentID: string, versionID: number): Promise<History> {
    const found = await this.documentService.findDocument(documentID)
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

  private transactionProvider(tx: Prisma.TransactionClient) {
    return {
      findDocument: async (documentID: string) => {
        const found = await tx.manuscriptDoc.findUnique({
          where: {
            manuscript_model_id: documentID,
          },
        })
        if (!found) {
          throw new MissingDocumentError(documentID)
        }
        return found
      },
      updateDocument: async (documentID: string, payload: IUpdateDocument) => {
        try {
          const saved = await tx.manuscriptDoc.update({
            data: payload,
            where: {
              manuscript_model_id: documentID,
            },
          })
          return saved
        } catch (error) {
          if (error.code === PrismaErrorCodes.RecordMissing) {
            throw new MissingRecordError(documentID)
          }
          throw error
        }
      },
    }
  }
  private hydrateSteps(jsonSteps: Prisma.JsonValue[]): Step[] {
    return jsonSteps.map((step: Prisma.JsonValue) => Step.fromJSON(schema, step)) as Step[]
  }
}
