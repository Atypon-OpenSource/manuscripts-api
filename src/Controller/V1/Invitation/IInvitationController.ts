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

import { Request } from 'express'
import { InvitationToken } from '../../../Models/UserModels'
import { ContainerInvitationResponse } from '../../../Models/ContainerModels'

export interface IInvitationController {
  /**
   * Invites a user.
   * @param req Request express request.
   */
  invite(req: Request): Promise<void>
  /**
   * Invite a user to a container.
   * @param req Request express request.
   * @returns Array of all generated invitations.
   */
  inviteToContainer(req: Request): Promise<[string, string][]>
  /**
   * Reject an invitation.
   * @param req Request express request.
   */
  reject(req: Request): Promise<void>
  /**
   * Accept an invitation.
   * @param req Request express request.
   */
  accept(req: Request): Promise<ContainerInvitationResponse>
  /**
   * Remove a sent invitation.
   * @param req Request express request.
   */
  uninvite(req: Request): Promise<void>
  /**
   * Request an invitation token, to be used as part of inviation URL.
   * @param req Request express request.
   */
  requestInvitationToken(req: Request): Promise<InvitationToken>
  /**
   * Request the invitation token TTL.
   * @param req Request express request.
   */
  refreshInvitationToken(req: Request): Promise<InvitationToken>
  /**
   * Accept the invitation token.
   * @param req Request express request.
   */
  acceptInvitationToken(req: Request): Promise<ContainerInvitationResponse>
}
