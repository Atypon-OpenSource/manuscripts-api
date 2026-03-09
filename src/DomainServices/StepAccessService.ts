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
import { Attrs, Fragment, Node, Slice } from 'prosemirror-model'
import { AttrStep, ReplaceAroundStep, ReplaceStep, Step } from 'prosemirror-transform'

import { AccessContext } from '../Models/AccessContextModels'
import { NodeAccessRegistry } from '../Utilities/NodeAccess/NodeAccessRegistry'

type ExposedSlice = Slice & {
  insertAt: (pos: number, fragment: Fragment) => Slice
}

export class StepAccessService {
  constructor(private readonly registry: NodeAccessRegistry) {}

  validate(step: Step, doc: Node, context: AccessContext) {
    if (step instanceof ReplaceAroundStep) {
      const gap = doc.slice(step.gapFrom, step.gapTo)
      const slice = (step.slice as ExposedSlice).insertAt(step.insert, gap.content)
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

  private validateReplaceStep(step: ReplaceStep, doc: Node, context: AccessContext) {
    if (this.isStepUpdateNodeAttr(step, doc.slice(step.from, step.to))) {
      const node = step.slice.content.firstChild!
      return !this.findDiff(doc.slice(step.from, step.to).content.firstChild!, node.attrs).find(
        (attr) => !this.registry.canEditAttr(node, attr, context)
      )
    }

    let hasAccess = true

    doc.slice(step.from, step.to).content.descendants((node) => {
      if (!this.registry.canDeleteNode(node, context)) {
        hasAccess = false
        return false
      }
    })

    step.slice.content.descendants((node) => {
      if (!this.registry.canInsertNode(node, context)) {
        hasAccess = false
        return false
      }
    })

    return hasAccess
  }

  private validateAttrStep(step: AttrStep, doc: Node, context: AccessContext) {
    const node = doc.nodeAt(step.pos)
    return !!(node && this.registry.canEditAttr(node, step.attr, context))
  }

  private isStepUpdateNodeAttr(step: ReplaceStep, slice: Slice) {
    const stepContent = step.slice.content
    const sliceContent = slice.content
    return (
      stepContent.size === sliceContent.size &&
      stepContent.childCount === 1 &&
      sliceContent.childCount === 1 &&
      stepContent.firstChild!.content.eq(sliceContent.firstChild!.content)
    )
  }

  private findDiff(node: Node, attrs: Attrs) {
    const keys: string[] = []
    Object.entries(attrs).map(([key, value]) => {
      if (!node.hasMarkup(node.type, { ...node.attrs, [key]: value })) {
        keys.push(key)
      }
    })
    return keys
  }
}
