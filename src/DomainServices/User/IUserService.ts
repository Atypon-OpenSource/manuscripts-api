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

import { UserProfileLike } from '../../DataAccess/Interfaces/Models'

export interface IUserService {
  deleteUser(userId: string): Promise<boolean>
  markUserForDeletion(userId: string, password?: string): Promise<void>
  unmarkUserForDeletion(userId: string): Promise<void>
  clearUsersData(): Promise<void>
  profile(token: string): Promise<UserProfileLike | null>
  authenticateUser(token: string): Promise<void>
}
