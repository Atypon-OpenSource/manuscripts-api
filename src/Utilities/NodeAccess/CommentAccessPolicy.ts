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
import { CommentNode, schema } from '@manuscripts/transform'
import { Node } from 'prosemirror-model'

import { AccessContext } from '../../Models/AccessContextModels'
import { NodeAccessPolicy } from '../../Models/NodeAccessModels'

export class CommentAccessPolicy implements NodeAccessPolicy {
  canInsertNode(_node: Node, context: AccessContext): boolean {
    return context.capabilities.createComment
  }

  canDeleteNode(node: Node, context: AccessContext): boolean {
    return this.isOwn(node as CommentNode, context.userId)
      ? context.capabilities.handleOwnComments
      : context.capabilities.handleOthersComments
  }

  canEditAttr(node: Node, attr: string, context: AccessContext): boolean {
    const isOwn = this.isOwn(node as CommentNode, context.userId)

    if (this.schemaHasAttr('contents') && attr === 'contents') {
      return isOwn
        ? context.capabilities.handleOwnComments
        : context.capabilities.handleOthersComments
    } else if (this.schemaHasAttr('resolved') && attr === 'resolved') {
      return isOwn
        ? context.capabilities.resolveOwnComment
        : context.capabilities.resolveOthersComment
    }
    return false
  }

  private isOwn(comment: CommentNode, userId: string) {
    const profileID = this.schemaHasAttr('userID') && comment.attrs.userID
    return profileID && profileID === userId
  }

  private schemaHasAttr(attr: string) {
    const commentAttrsSpec = schema.nodes.comment.spec.attrs
    return commentAttrsSpec && attr in commentAttrsSpec
  }
}
