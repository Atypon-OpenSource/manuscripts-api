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

import { KeyValueRepository } from './KeyValueRepository'
import { UserProfileLike } from '../Interfaces/Models'
import { UserProfile } from '@manuscripts/manuscripts-json-schema'

/**
 * Manages user profile persistent storage operations.
 */
export interface IUserProfileRepository extends KeyValueRepository<UserProfile, UserProfileLike, UserProfileLike, UserProfileLike> {}
