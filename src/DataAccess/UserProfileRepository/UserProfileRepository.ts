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

import { SGRepository } from '../SGRepository'
import { IUserProfileRepository } from '../Interfaces/IUserProfileRepository'
import { UserProfileLike } from '../Interfaces/Models'
import { UserProfile } from '@manuscripts/manuscripts-json-schema'

export class UserProfileRepository
  extends SGRepository<
    UserProfile,
    UserProfileLike,
    UserProfileLike,
    UserProfileLike
  >
  implements IUserProfileRepository {
  public get objectType (): string {
    return 'MPUserProfile'
  }
}
