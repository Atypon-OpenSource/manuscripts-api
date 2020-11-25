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
 * Represents data passed in "state" param for IAM Auth flows
 */
export interface IAMState {
  [key: string]: string | null
  /**
   * Device ID passed by the client
   */
  deviceId: string,
  /**
   * Uri tracked by the client application to return the user back to the originally requested url, before
   * OAuth flow was started by the client application
   */
  redirectUri: string | null,
  /**
   * Represents UI theme used by the client application
   */
  theme: string | null
}
