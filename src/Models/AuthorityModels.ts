/*!
 * © 2024 Atypon Systems LLC
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

import { Prisma } from '@prisma/client'
import { Step } from 'prosemirror-transform'

export type ReceiveSteps = {
  steps: Prisma.JsonObject[]
  clientID: number
  version: number
}

export type History = {
  steps: Step[] | Prisma.JsonValue[]
  clientIDs: number[]
  version: number
  doc?: Prisma.JsonValue
}

export type DocumentHistory = History & { doc: Prisma.JsonValue | undefined }
export interface ModifiedStep extends Prisma.JsonObject {
  clientID: string
}
