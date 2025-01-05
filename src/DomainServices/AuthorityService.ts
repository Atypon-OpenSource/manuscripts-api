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

import { getVersion, ManuscriptNode, schema } from '@manuscripts/transform'
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
    const old = schema.nodeFromJSON(document)
    let current = old
    for (let i = 0; i < steps.length; i++) {
      current = steps[i].apply(current).doc || current
      modifiedSteps.push({ ...jsonSteps[i], clientID })
    }
    console.log(this.changedDescendants(old, current, 0))
    return { doc: current.toJSON(), modifiedSteps }
  }

  private hydrateSteps(jsonSteps: Prisma.JsonValue[]): Step[] {
    return jsonSteps.map((step: Prisma.JsonValue) => Step.fromJSON(schema, step)) as Step[]
  }

  //this is based on https://github.com/ProseMirror/prosemirror-tables/blob/24392b4e145adea95b765138b887509ad9b773b2/src/fixtables.js#L13
  private changedDescendants = (
    oldDoc: ManuscriptNode,
    currentDoc: ManuscriptNode,
    offset: number
  ) => {
    const changedNodes: ManuscriptNode[] = []
    const oldSize = oldDoc.childCount
    const currentSize = currentDoc.childCount
    outerLoop: for (let i = 0, j = 0; i < currentSize; i++) {
      const currentChild = currentDoc.child(i)
      for (let scan = j, e = Math.min(oldSize, i + 3); scan < e; scan++) {
        if (oldDoc.child(scan) === currentChild) {
          j = scan + 1
          offset += currentChild.nodeSize
          continue outerLoop
        }
      }
      changedNodes.push(currentChild)
      if (j < oldSize && oldDoc.child(j).sameMarkup(currentChild)) {
        this.changedDescendants(oldDoc.child(j), currentChild, offset + 1)
      } else {
        currentChild.nodesBetween(
          0,
          currentChild.content.size,
          (node) => {
            changedNodes.push(node)
          },
          offset + 1
        )
      }
      offset += currentChild.nodeSize
    }
    return changedNodes
  }
}
