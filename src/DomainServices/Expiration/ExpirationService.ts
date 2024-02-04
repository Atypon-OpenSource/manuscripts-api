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

import { IUserEventRepository } from '../../DataAccess/Interfaces/IUserEventRepository'
import { IUserTokenRepository } from '../../DataAccess/Interfaces/IUserTokenRepository'

export class ExpirationService {
  constructor(
    private userEventRepository: IUserEventRepository,
    private userTokenRepository: IUserTokenRepository
  ) {}

  public async clearExpiredDocuments(): Promise<void> {
    await this.clearEvents()
    await this.clearUserTokens()
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
}
