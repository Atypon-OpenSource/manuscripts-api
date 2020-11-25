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

/**
 * Represents all possible fields for a token object.
 */
export interface NewSingleUseToken {
  /**
   * Token's unique id.
   */
  _id?: string
  /**
   * User's id.
   */
  userId: string
  /**
   * Token type
   */
  tokenType: SingleUseTokenType
  /**
   * Token creation time
   */
  createdAt: number
}

/**
 * Represents all possible fields for a token object.
 */
export interface UpdateSingleUseToken {
  _id?: string
  /**
   * Token last modification time
   */
  updatedAt?: number | null
}

/**
 * Represents all possible fields for a token object.
 */
export interface SingleUseToken {
  /**
   * Token's unique id.
   */
  _id: string
  /**
   * User's id.
   */
  userId: string
  /**
   * Token type
   */
  tokenType: SingleUseTokenType
  /**
   * Token creation time
   */
  createdAt: number
  /**
   * Token last modification time
   */
  updatedAt: number | null
}

export enum SingleUseTokenType {
    ResetPasswordToken = 'resetPasswordToken',
    VerifyEmailToken = 'verifyEmailToken',
    InvitationEmailToken = 'InvitationEmailToken'
  }
