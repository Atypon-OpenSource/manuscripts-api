/*!
 * © 2022 Atypon Systems LLC
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

import { onUpdate } from '../DomainServices/eventing'
import prisma from './prismaClient'
const UPDATE_ACTIONS = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert']
export default function applyMiddleware() {
  prisma.$use(async (params: any, next: any) => {
    const res = await next(params)
    const id = params.args.data?.id || params.args.where?.id
    if (id && UPDATE_ACTIONS.includes(params.action)) {
      await onUpdate((res || {}).data, id)
    }
    return res
  })
}
