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
import { Node } from 'prosemirror-model'

import { AccessContext } from '../../Models/AccessContextModels'

export class NodeAccessRegistry {
  canInsertNode(node: Node, context: AccessContext): boolean {
    const canInsertNode = schema.nodes[node.type.name].spec.canInsertNode
    return canInsertNode ? canInsertNode(node, context) : true
  }

  canDeleteNode(node: Node, context: AccessContext): boolean {
    const canDeleteNode = schema.nodes[node.type.name].spec.canDeleteNode
    return canDeleteNode ? canDeleteNode(node, context) : true
  }

  canEditAttr(node: Node, attr: string, context: AccessContext): boolean {
    const canEditAttr = schema.nodes[node.type.name].spec.canEditAttr
    return canEditAttr ? canEditAttr(node, attr, context) : true
  }
}

export function createNodeAccessRegistry(): NodeAccessRegistry {
  return new NodeAccessRegistry()
}
