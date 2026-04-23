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
import { ManuscriptNode, ManuscriptNodeType, schema } from '@manuscripts/transform'

import { AccessContext } from '../../Models/AccessContextModels'
import { NodeAccessPolicy } from '../../Models/NodeAccessModels'
import { CommentAccessPolicy } from './CommentAccessPolicy'
import { DefaultNodeAccessPolicy } from './DefaultNodeAccessPolicy'

export class NodeAccessRegistry {
  private policies = new Map<ManuscriptNodeType, NodeAccessPolicy>()
  private readonly defaultPolicy: NodeAccessPolicy

  constructor(defaultPolicy?: NodeAccessPolicy) {
    this.defaultPolicy = defaultPolicy ?? new DefaultNodeAccessPolicy()
  }

  register(nodeType: ManuscriptNodeType, policy: NodeAccessPolicy): this {
    this.policies.set(nodeType, policy)
    return this
  }

  getPolicy(nodeType: ManuscriptNodeType): NodeAccessPolicy {
    return this.policies.get(nodeType) ?? this.defaultPolicy
  }

  canInsertNode(node: ManuscriptNode, context: AccessContext): boolean {
    return this.getPolicy(node.type).canInsertNode(node, context)
  }

  canDeleteNode(node: ManuscriptNode, context: AccessContext): boolean {
    return this.getPolicy(node.type).canDeleteNode(node, context)
  }

  canEditAttr(node: ManuscriptNode, attr: string, context: AccessContext): boolean {
    return this.getPolicy(node.type).canEditAttr(node, attr, context)
  }
}

export function createNodeAccessRegistry(): NodeAccessRegistry {
  return new NodeAccessRegistry().register(schema.nodes.comment, new CommentAccessPolicy())
}
