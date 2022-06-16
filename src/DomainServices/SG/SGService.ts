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

import { DIContainer } from '../../DIContainer/DIContainer'
import { ContainerService } from '../Container/ContainerService'
import { ISGService } from './ISGService'
import jsonwebtoken from 'jsonwebtoken'
import { isLoginTokenPayload } from '../../Utilities/JWT/LoginTokenPayload'
import { InvalidCredentialsError } from '../../Errors'
import { SGRepository } from '../../DataAccess/SGRepository'
import * as HttpStatus from 'http-status-codes'

export class SGService implements ISGService {
  readonly repoMap: any

  constructor() {
    this.repoMap = {
      MPProject: 'projectRepository',
      MPCollaboration: 'collaborationsRepository',
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

  public async get(token: string, id: string): Promise<any> {
    const userId = this.getUserId(token)
    const repo = this.getRepoById(id)
    return repo.getById(id, userId)
  }

  public async create(token: string, doc: any): Promise<any> {
    const userId = this.getUserId(token)
    const repo = this.getRepoById(doc._id)
    return repo.create(doc, userId)
  }

  public async update(token: string, id: string, doc: any): Promise<any> {
    const userId = this.getUserId(token)
    const repo = this.getRepoById(id)
    return repo.patch(id, doc, userId).catch((err: any) => {
      if (err.statusCode === HttpStatus.BAD_REQUEST) {
        doc._id = id
        return this.create(token, doc)
      }
      return Promise.reject(err)
    })
  }

  public async remove(token: string, id: any): Promise<any> {
    const userId = this.getUserId(token)
    const repo = this.getRepoById(id)
    return repo.remove(id, userId)
  }

  private getUserId(token: string) {
    const payload = jsonwebtoken.decode(token)
    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }
    return ContainerService.userIdForSync(payload.userId)
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
