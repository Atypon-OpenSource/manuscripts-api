/*!
 * © 2022 Atypon Systems LLC
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

import { ContainerInvitationRepository } from '../../DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { IInvitationTokenRepository } from '../../DataAccess/Interfaces/IInvitationTokenRepository'
import { IUserEventRepository } from '../../DataAccess/Interfaces/IUserEventRepository'
import { IUserTokenRepository } from '../../DataAccess/Interfaces/IUserTokenRepository'
import { InvitationRepository } from '../../DataAccess/InvitationRepository/InvitationRepository'

export class ExpirationService {
  constructor(
    private userEventRepository: IUserEventRepository,
    private userTokenRepository: IUserTokenRepository,
    private invitationRepository: InvitationRepository,
    private invitationTokenRepository: IInvitationTokenRepository,
    private containerInvitationRepository: ContainerInvitationRepository
  ) {}

  public async clearExpiredDocuments(): Promise<void> {
    await this.clearEvents()
    await this.clearUserTokens()
    await this.clearInvitations()
    await this.clearInvitationTokens()
    await this.clearContainerInvitations()
  }

  private async clearEvents(): Promise<void> {
    const expiredDocs = await this.userEventRepository.getExpired()
    for (const doc of expiredDocs) {
      await this.userEventRepository.remove({ _id: doc._id })
    }
  }

  private async clearUserTokens(): Promise<void> {
    const expiredDocs = await this.userTokenRepository.getExpired()
    for (const doc of expiredDocs) {
      await this.userTokenRepository.remove({ id: doc._id })
    }
  }

  private async clearInvitations(): Promise<void> {
    const expiredDocs = await this.invitationRepository.getExpired()
    for (const doc of expiredDocs) {
      await this.invitationRepository.remove(doc._id)
    }
  }

  private async clearInvitationTokens(): Promise<void> {
    const expiredDocs = await this.invitationTokenRepository.getExpired()
    for (const doc of expiredDocs) {
      await this.invitationTokenRepository.remove({ id: doc._id })
    }
  }

  private async clearContainerInvitations(): Promise<void> {
    const expiredDocs = await this.containerInvitationRepository.getExpired()
    for (const doc of expiredDocs) {
      await this.containerInvitationRepository.remove(doc._id)
    }
  }
}
