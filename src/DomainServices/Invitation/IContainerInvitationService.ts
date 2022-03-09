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
  ContainerRole,
  ContainerInvitationResponse,
  InvitedUserData,
} from '../../Models/ContainerModels'
import { InvitationToken, User } from '../../Models/UserModels'

export interface IContainerInvitationService {
  inviteToContainer(
    invitingUserId: string,
    invitedUser: InvitedUserData[],
    containerID: string,
    role: string,
    message: string,
    skipEmail: boolean | undefined
  ): Promise<[string, string][]>

  rejectContainerInvite(invitationId: string): Promise<void>

  acceptContainerInvite(
    invitationId: string,
    user: User,
    skipEmail?: boolean
  ): Promise<ContainerInvitationResponse>

  uninvite(userId: string, invitationId: string): Promise<void>

  requestInvitationToken(
    clientId: string,
    containerID: string,
    role: ContainerRole
  ): Promise<InvitationToken>

  refreshInvitationToken(
    clientId: string,
    containerID: string,
    role: ContainerRole
  ): Promise<InvitationToken>

  acceptInvitationToken(
    token: string,
    userId: string,
    skipEmail?: boolean
  ): Promise<ContainerInvitationResponse>

  markInvitationAsAccepted(invitationId: string): Promise<void>

  updateInvitedUserID(userID: string, userEmail: string): Promise<void>
}
