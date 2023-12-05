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
import type { RequestQueueItem } from '../../../types/quarterback/utils'

export const queue: RequestQueueItem[] = []
import { Request, Response } from 'express'

export const queueRequests = async (
  req: Request,
  res: Response,
  callbackFunction: (req: Request, res: Response) => Promise<void>
) => {
  queue.push({ req, res, callbackFunction })

  if (queue.length === 1) {
    await processNextRequest()
  }
}
const processNextRequest = async () => {
  const item = queue.shift()
  if (item) {
    const { req, res, callbackFunction } = item
    await callbackFunction(req, res)
    if (queue.length > 0) {
      await processNextRequest()
    }
  }
}
