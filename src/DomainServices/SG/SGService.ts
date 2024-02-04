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

import { StatusCodes } from 'http-status-codes'

import { SGRepository } from '../../DataAccess/SGRepository'
import { DIContainer } from '../../DIContainer/DIContainer'
import { ISGService } from './ISGService'

export class SGService implements ISGService {
  readonly repoMap: any

  constructor() {
    this.repoMap = {
      MPProject: 'projectRepository',
      MPUserProfile: 'userProfileRepository',
      MPContainerInvitation: 'containerInvitationRepository',
      MPInvitation: 'invitationRepository',
      MPContainerRequest: 'containerRequestRepository',
      MPSubmission: 'submissionRepository',
      MPManuscriptNote: 'manuscriptNoteRepository',
      MPManuscript: 'manuscriptRepository',
      MPCorrection: 'correctionRepository',
      MPSnapshot: 'snapshotRepository',
      MPManuscriptTemplate: 'templateRepository',
    }
  }

  public async get(id: string): Promise<any> {
    const repo = this.getRepoById(id)
    return repo.getById(id)
  }

  public async create(doc: any): Promise<any> {
    const repo = this.getRepoById(doc._id)
    return repo.create(doc)
  }

  public async update(id: string, doc: any): Promise<any> {
    const repo = this.getRepoById(id)
    return repo.patch(id, doc).catch((err: any) => {
      if (err.statusCode === StatusCodes.BAD_REQUEST) {
        doc._id = id
        return this.create(doc)
      }
      // eslint-disable-next-line promise/no-return-wrap
      return Promise.reject(err)
    })
  }

  public async remove(id: any): Promise<any> {
    const repo = this.getRepoById(id)
    return repo.remove(id)
  }

  private getRepoById(id: string) {
    const objectType = id.split(':')[0]
    const repoName = this.repoMap[objectType]
    return DIContainer.sharedContainer[repoName as keyof DIContainer] as SGRepository<
      any,
      any,
      any,
      any
    >
  }
}
