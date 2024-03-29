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

import {
  NewSingleUseToken,
  SingleUseToken,
  SingleUseTokenType,
  UpdateSingleUseToken,
} from '../../Models/SingleUseTokenModels'
import { User } from '../../Models/UserModels'
import { IndexedRepository } from './IndexedRepository'
import { SingleUseTokenQueryCriteria } from './QueryCriteria'

/**
 * Manages user persistent storage operations.
 */
export interface ISingleUseTokenRepository
  extends IndexedRepository<
    SingleUseToken,
    NewSingleUseToken,
    UpdateSingleUseToken,
    SingleUseTokenQueryCriteria
  > {
  ensureTokenExists(
    user: User,
    tokenType: SingleUseTokenType,
    expiry: number | undefined
  ): Promise<string>
}
