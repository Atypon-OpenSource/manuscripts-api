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

import { User } from '../../Models/UserModels'

export interface ISyncService {
  /** Gets a Sync Gateway user in the specified bucket using the SG Admin API. */
  gatewayAccountExists(userId: string): Promise<boolean>

  /** Creates a Sync Gateway user using the SG Admin API. If password passed is null, a random password is given. */
  createGatewayAccount(userId: string): Promise<string>

  removeGatewayAccount(userId: string): Promise<void>

  createGatewayContributor(user: User): Promise<any>
}
