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
import { SingleUseTokenType } from '../../Models/SingleUseTokenModels'

export interface QueryCriteria {
  [key: string]: string | number | boolean | string[] | number[] | boolean[] | null | undefined
}

/**
 * Represents criteria for a a user query.
 */
export interface UserQueryCriteria extends QueryCriteria {
  /**
   * The user's id.
   */
  _id?: string | null

  /**
   * The user's name.
   */
  name?: string | null

  /**
   * The user's email.
   */
  email?: string | string[] | null

  /**
   * The connect id of a user.
   */
  connectUserID?: string
}

/**
 * Represents criteria for a user token query.
 */
export interface UserTokenQueryCriteria extends QueryCriteria {
  /**
   * User's unique id.
   */
  userId?: string
  /**
   * User's device unique id.
   */
  deviceId?: string
}

export interface InvitationTokenQueryCriteria extends QueryCriteria {
  /**
   * Container's unique id.
   */
  containerID?: string
  /**
   * Invited role.
   */
  permittedRole?: ContainerRole
}

/**
 * Represents criteria for a token query.
 */
export interface SingleUseTokenQueryCriteria extends QueryCriteria {
  /**
   * Token's unique id.
   */
  _id?: string
  /**
   * User's unique id.
   */
  userId?: string
  /**
   * Token's type.
   */
  tokenType?: SingleUseTokenType
}

/**
 * Represents criteria for a Collaboration query.
 */
export interface CollaborationsQueryCriteria extends QueryCriteria {
  /**
   * Collaboration unique id.
   */
  _id?: string
}
