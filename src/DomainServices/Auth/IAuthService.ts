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
  AuthorizedUser,
  Credentials,
  GoogleAccessCredentials,
  ResetPasswordCredentials,
  BucketSessions,
  ChangePasswordCredentials,
  ServerToServerAuthCredentials,
} from '../../Models/UserModels'
import { IAMAuthTokenPayload } from '../../Utilities/JWT/IAMAuthTokenPayload'
import { IAMState } from '../../Auth/Interfaces/IAMState'
import { IAMStartData } from '../../Models/IAMModels'

export interface ResetPasswordOptions {
  /**
   * Token's unique id.
   */
  tokenId: string
  /**
   * User's new password.
   */
  password: string
}

export interface IAuthService {
  /**
   * Validates user credentials and creates auth token if credentials is valid.
   * @param credentials User's login credentials.
   */
  login(credentials: Credentials): Promise<AuthorizedUser>

  /**
   * Authenticate an admin user login.
   */
  serverToServerAuth(credentials: ServerToServerAuthCredentials): Promise<AuthorizedUser>

  /**
   * Create token on behalf of user.
   */
  serverToServerTokenAuth(credentials: ServerToServerAuthCredentials): Promise<AuthorizedUser>
  /**
   * Returns url to initiate IAM OAuth flow
   * @param state represents value of "state" passed to IAM
   */
  iamOAuthStartData(state: IAMState, action?: string): Promise<IAMStartData>

  /**
   * Constructs url where user should be redirected back, when there is an error
   * in IAM OAuth flow.
   * @returns {string} URL where user should be redirected back, in case of error
   */
  iamOAuthErrorURL(errorDescription: string, serverUrl: string): string

  /**
   * Handles IAM callback after user registration/login
   */
  iamOAuthCallback(iamOauthToken: IAMAuthTokenPayload, state: IAMState): Promise<AuthorizedUser>

  /**
   * Decodes the "state" param returned by IAM and returns the {@link IAMState} object representing the found data
   * @param stateParam
   */
  decodeIAMState(stateParam: string): IAMState

  /**
   * Validate user's google login info and create new user object if user doesn't exists.
   * @param googleAccess User's google login access.
   */
  loginGoogle(googleAccess: GoogleAccessCredentials): Promise<AuthorizedUser>

  /**
   * Sends email to reset password.
   */
  sendPasswordResetInstructions(email: string): Promise<void>

  /**
   * Resets the user password and log the user in.
   */
  resetPassword(resetPasswordCredentials: ResetPasswordCredentials): Promise<AuthorizedUser>

  /**
   * Ends user's session if exists.
   * @param token User's token.
   */
  logout(token: string): Promise<void>

  /**
   *  Ends user's session if exists.
   * @param iamSessionID Connect session ID for the user.
   */
  backchannelLogout(iamSessionID: string): Promise<void>

  /**
   * Refreshes the sync session for the given device, removing any existing ones.
   * @param token User's token.
   */
  refreshSyncSessions(token: string): Promise<BucketSessions>

  /**
   * Change the user password and delete sync sessions, token for all the other devices.
   */
  changePassword(credentials: ChangePasswordCredentials): Promise<void>
}
