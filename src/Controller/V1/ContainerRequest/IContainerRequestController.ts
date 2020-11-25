/*!
 * © 2020 Atypon Systems LLC
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

import { Request } from 'express'

export interface IContainerRequestController {
  /**
   * Creates a request.
   * @param req Express request.
   */
  create (req: Request): Promise<void>

  /**
   * Accepts the request and adds/manages user's role or rejects it and removes the request
   * @param req Express request.
   * @param accept If true then accept the request, otherwise reject it
   */
  response (req: Request, accept: boolean): Promise<void>
}
