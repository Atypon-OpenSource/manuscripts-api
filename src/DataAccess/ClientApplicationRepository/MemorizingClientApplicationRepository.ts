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

import { MemorizingRepository } from '../MemorizingRepository/MemorizingRepository'
import { ClientApplication, ClientApplicationQueryCriteria } from '../../Models/ClientApplicationModels'
import { IClientApplicationRepository } from '../Interfaces/IClientApplicationRepository'

export class MemorizingClientApplicationRepository extends MemorizingRepository<ClientApplication, ClientApplication, ClientApplication, ClientApplicationQueryCriteria> implements IClientApplicationRepository {
  constructor (private applicationRepository: IClientApplicationRepository, cacheTTLSeconds: number) {
    super(applicationRepository, cacheTTLSeconds)
  }

  public ensureApplicationsExist (applications: ReadonlyArray<ClientApplication>): Promise<void> {
    return this.applicationRepository.ensureApplicationsExist(applications)
  }
}
