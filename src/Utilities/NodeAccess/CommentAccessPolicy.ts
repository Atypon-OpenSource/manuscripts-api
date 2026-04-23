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
import { ManuscriptNode } from '@manuscripts/transform'

import { AccessContext } from '../../Models/AccessContextModels'
import { NodeAccessPolicy } from '../../Models/NodeAccessModels'

export class CommentAccessPolicy implements NodeAccessPolicy {
  canInsertNode(_node: ManuscriptNode, context: AccessContext): boolean {
    return context.capabilities.createComment
  }

  canDeleteNode(node: ManuscriptNode, context: AccessContext): boolean {
    return context.adapter.getNodeOwnerId(node) === context.userId
      ? context.capabilities.handleOwnComments
      : context.capabilities.handleOthersComments
  }

  canEditAttr(node: ManuscriptNode, attr: string, context: AccessContext): boolean {
    const attributeCapabilities = context.adapter.getRequiredCapabilityAttr(node, attr)
    if (!attributeCapabilities) {
      return false
    }

    const isOwn = context.adapter.getNodeOwnerId(node) === context.userId

    if (isOwn) {
      return (
        (attributeCapabilities.has('handleOwnComments') &&
          context.capabilities.handleOwnComments) ||
        (attributeCapabilities.has('resolveOwnComment') && context.capabilities.resolveOwnComment)
      )
    }

    return (
      (attributeCapabilities.has('handleOthersComments') &&
        context.capabilities.handleOthersComments) ||
      (attributeCapabilities.has('resolveOthersComment') &&
        context.capabilities.resolveOthersComment)
    )
  }
}
