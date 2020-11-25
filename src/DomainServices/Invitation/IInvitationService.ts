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

import { ContainerInvitationResponse } from '../../Models/ContainerModels'

export interface IInvitationService {
  invite (
    invitingUserId: string,
    invitedUserIds: string[],
    message: string | null
  ): Promise<void>
  reject (invitationId: string): Promise<void>
  accept (
    invitationId: string,
    password: string | null,
    name: string | null
  ): Promise<ContainerInvitationResponse>
  updateInvitedUserID (
    userID: string,
    userEmail: string
  ): Promise<void>
}
