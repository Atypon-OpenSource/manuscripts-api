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

import { getVersion, JSONNode, schema } from '@manuscripts/transform'
import { Prisma } from '@prisma/client'
import { JsonObject } from '@prisma/client/runtime/library'
import { Step } from 'prosemirror-transform'

import { VersionMismatchError } from '../Errors'
import { History, ModifiedStep, ReceiveSteps } from '../Models/AuthorityModels'
import { DB } from '../Models/RepositoryModels'
export class AuthorityService {
  constructor(private readonly repository: DB) {}

  public async receiveSteps(documentID: string, receiveSteps: ReceiveSteps): Promise<History> {
    //TODO: check if the transaction is doing anything here, it doesn't look like its useful in anyway for our case
    return this.repository.$transaction(async (tx) => {
      const found = await tx.manuscriptDoc.findDocument(documentID)
      this.checkVersion(found.version, receiveSteps.version)
      const { doc, modifiedSteps } = this.applyStepsToDocument(
        receiveSteps.steps,
        found.doc,
        receiveSteps.clientID.toString()
      )
      await tx.manuscriptDoc.updateDocument(documentID, {
        doc: doc,
        version: receiveSteps.version + receiveSteps.steps.length,
        steps: (found.steps as JsonObject[]).concat(modifiedSteps),
        schema_version: getVersion(),
      })
      return {
        steps: receiveSteps.steps,
        clientIDs: Array(receiveSteps.steps.length).fill(receiveSteps.clientID),
        version: receiveSteps.version + receiveSteps.steps.length,
      }
    })
  }

  public async getEvents(documentID: string, versionID: number): Promise<History> {
    const found = await this.repository.manuscriptDoc.findHistory(documentID)

    const startIndex = found.steps.length - (found.version - versionID)
    const steps = found.steps.slice(startIndex)
    const clientIDs = steps
      .filter((step): step is { clientID: string } => typeof step === 'object' && step !== null)
      .map((step: { clientID: string }) => parseInt(step.clientID))

    const history = {
      steps: this.hydrateSteps(steps),
      clientIDs,
      version: found.version,
    }
    return history
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

  public static removeSuggestions(node: JSONNode) {
    if (node.content?.length) {
      const newContent = []
      nodesLoop: for (let i = 0; i < node.content?.length; i++) {
        const child = node.content[i]
        const newMarks = []
        if (child.type === 'text' && child.marks) {
          for (let j = 0; j < child.marks?.length; j++) {
            if (child.marks[j].type === 'tracked_insert') {
              // skipping the entire node as it's unconfirmed
              continue nodesLoop
            }

            if (child.marks[j].type === 'tracked_delete') {
              // drop marks and treat deleted content as normal
              continue
            }
            newMarks.push(child.marks[j])
          }
          child.marks = newMarks
        }
        if (child.attrs && child.attrs.dataTracked) {
          const changes = child.attrs.dataTracked
          if (changes.some(({ operation }: { operation: string }) => operation === 'insert')) {
            continue
          }
          if (changes.some(({ operation }: { operation: string }) => operation === 'set_attrs')) {
            child.attrs = changes[0].oldAttrs
          }
        }
        AuthorityService.removeSuggestions(child)
        newContent.push(child)
      }
      node.content = newContent
    }
    return node
  }
}
