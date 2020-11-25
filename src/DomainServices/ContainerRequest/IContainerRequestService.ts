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

import { ContainerRole } from '../../Models/ContainerModels'
import { User } from '../../Models/UserModels'

export interface IContainerRequestService {
  /**
   * Creates an access request to a specific container.
   * @param containerID The id of the container wanted to be accessed.
   * @param role The requested role.
   */
  create (user: User, containerID: string, role: ContainerRole): Promise<void>

  /**
   * Accepts the container access request and give the specified role to the user or rejects it and removes the request.
   * @param requestID The id of the container request.
   * @param acceptingUser The user who accepted the request.
   * @param accept If true then the request is accepted else rejected
   */
  response (requestID: string, acceptingUser: User, accept: boolean): Promise<void>
}
