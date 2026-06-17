/*!
 * © 2026 Atypon Systems LLC
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
import { AccessContext, getNodeAccessPolicy, ManuscriptNode } from '@manuscripts/transform'
import { AttrStep, ReplaceAroundStep, ReplaceStep, Step } from 'prosemirror-transform'

type ExposedSlice<T, F> = T & {
  insertAt: (pos: number, fragment: F) => T
}

export class StepAccessService {
  validate(step: Step, doc: ManuscriptNode, context: AccessContext) {
    if (step instanceof ReplaceAroundStep) {
      const gap = doc.slice(step.gapFrom, step.gapTo)
      const slice = (
        step.slice as ExposedSlice<typeof step.slice, typeof step.slice.content>
      ).insertAt(step.insert, gap.content)
      return this.validateReplaceStep(new ReplaceStep(step.from, step.to, slice), doc, context)
    }

    if (step instanceof ReplaceStep) {
      return this.validateReplaceStep(step, doc, context)
    }

    if (step instanceof AttrStep) {
      return this.validateAttrStep(step, doc, context)
    }
    return true
  }

  private validateReplaceStep(step: ReplaceStep, doc: ManuscriptNode, context: AccessContext) {
    if (this.isStepUpdateNodeAttr(step, doc)) {
      const node = step.slice.content.firstChild!
      const nodeDB = doc.slice(step.from, step.to).content.firstChild!
      return !this.findDiff(nodeDB, node).find((attr) => !this.attrPolicy(nodeDB, attr, context))
    }

    let hasAccess = true

    doc.slice(step.from, step.to).content.descendants((node) => {
      const deletePolicy = getNodeAccessPolicy(node.type)?.delete
      if (deletePolicy && !deletePolicy(node, context)) {
        hasAccess = false
        return false
      }
    })

    step.slice.content.descendants((node) => {
      const insertPolicy = getNodeAccessPolicy(node.type)?.insert
      if (insertPolicy && !insertPolicy(node, context)) {
        hasAccess = false
        return false
      }
    })

    return hasAccess
  }

  private validateAttrStep(step: AttrStep, doc: ManuscriptNode, context: AccessContext) {
    const node = doc.nodeAt(step.pos)
    return this.attrPolicy(node, step.attr, context)
  }

  private isStepUpdateNodeAttr(step: ReplaceStep, doc: ManuscriptNode) {
    const stepContent = step.slice.content
    const sliceContent = doc.slice(step.from, step.to).content
    return (
      stepContent.size === sliceContent.size &&
      stepContent.childCount === 1 &&
      sliceContent.childCount === 1 &&
      stepContent.firstChild!.content.eq(sliceContent.firstChild!.content)
    )
  }

  private findDiff(nodeA: ManuscriptNode, nodeB: ManuscriptNode) {
    const keys: string[] = []
    Object.entries(nodeB.attrs).map(([key, value]) => {
      if (!nodeA.hasMarkup(nodeA.type, { ...nodeA.attrs, [key]: value })) {
        keys.push(key)
      }
    })
    return keys
  }

  private attrPolicy(node: ManuscriptNode | null, attr: string, context: AccessContext) {
    const policy = node?.type && getNodeAccessPolicy(node.type)?.attrs

    if (policy) {
      // we could have a policy that applied to all attribute changes
      if (typeof policy === 'function') {
        return policy(node, context)
      } else {
        // apply policy per-attribute
        return !!policy[attr]?.(node, context)
      }
    }

    return true
  }
}
