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

import { IndexedRepository, PatchOptions } from './IndexedRepository'
import { UserStatus, UpdateUserStatus } from '../../Models/UserModels'
import { QueryCriteria } from './QueryCriteria'

/**
 * Manages user status persistent storage operations.
 */
export interface IUserStatusRepository
  extends IndexedRepository<UserStatus, UserStatus, UpdateUserStatus, QueryCriteria> {
  /**
   * Returns user status id based on user id
   */
  userStatusId(userId: string): string
  /**
   * Returns the user status for a specific user.
   */
  statusForUserId(userId: string): Promise<UserStatus | null>
  /**
   * Patches existing user status by a specific user id.
   */
  patchStatusWithUserId(
    userId: string,
    dataToPatch: Partial<UpdateUserStatus>,
    options: PatchOptions
  ): Promise<UserStatus>
}
