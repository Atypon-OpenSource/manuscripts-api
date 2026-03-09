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
import { schema } from '@manuscripts/transform'
import { Node, NodeType } from 'prosemirror-model'

import { AccessContext } from '../../Models/AccessContextModels'
import { NodeAccessPolicy } from '../../Models/NodeAccessModels'
import { CommentAccessPolicy } from './CommentAccessPolicy'
import { DefaultNodeAccessPolicy } from './DefaultNodeAccessPolicy'

export class NodeAccessRegistry {
  private policies = new Map<NodeType, NodeAccessPolicy>()
  private readonly defaultPolicy: NodeAccessPolicy

  constructor(defaultPolicy?: NodeAccessPolicy) {
    this.defaultPolicy = defaultPolicy ?? new DefaultNodeAccessPolicy()
  }

  register(nodeType: NodeType, policy: NodeAccessPolicy): this {
    this.policies.set(nodeType, policy)
    return this
  }

  getPolicy(nodeType: NodeType): NodeAccessPolicy {
    return this.policies.get(nodeType) ?? this.defaultPolicy
  }

  canInsertNode(node: Node, context: AccessContext): boolean {
    return this.getPolicy(node.type).canInsertNode(node, context)
  }

  canDeleteNode(node: Node, context: AccessContext): boolean {
    return this.getPolicy(node.type).canDeleteNode(node, context)
  }

  canEditAttr(node: Node, attr: string, context: AccessContext): boolean {
    return this.getPolicy(node.type).canEditAttr(node, attr, context)
  }
}

export function createNodeAccessRegistry(): NodeAccessRegistry {
  return new NodeAccessRegistry().register(schema.nodes.comment, new CommentAccessPolicy())
}
