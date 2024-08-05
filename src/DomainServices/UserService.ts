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

import { ObjectTypes, UserProfile } from '@manuscripts/json-schema'
import { User } from '@prisma/client'

import { AccountNotFoundError, RecordNotFoundError } from '../Errors'
import { ProjectClient, UserClient } from '../Models/RepositoryModels'
import { validateToken } from '../Utilities/JWT/LoginTokenPayload'

export class UserService {
  constructor(
    private readonly userRepository: UserClient,
    private readonly projectRepository: ProjectClient
  ) {}

  public async profile(token: string) {
    const payload = validateToken(token)
    const user = await this.userRepository.findByID(payload.userID)
    return user ? this.createUserProfile(user) : null
  }

  public async getProjectUserProfiles(projectID: string): Promise<UserProfile[]> {
    const project = await this.projectRepository.getProject(projectID)

    if (!project) {
      throw new RecordNotFoundError(projectID)
    }
    const annotator = project.annotators ?? []
    const proofers = project.proofers ?? []
    const editors = project.editors ?? []
    const projectUsers = project.owners.concat(
      editors,
      project.writers,
      project.viewers,
      annotator,
      proofers
    )
    const users = []
    for (const id of projectUsers) {
      const user = await this.userRepository.findByID(id)
      if (!user) {
        throw new AccountNotFoundError(id)
      }
      users.push(this.createUserProfile(user))
    }
    return users
  }

  public async getUserProjects(userID: string) {
    return await this.projectRepository.userProjects(userID)
  }

  private createUserProfile(user: User): UserProfile {
    return {
      _id: `${ObjectTypes.UserProfile}:${user.id.replace('User_', '')}`,
      bibliographicName: {
        family: user.family,
        given: user.given,
        objectType: ObjectTypes.BibliographicName,
        _id: `${ObjectTypes.BibliographicName}:${user.id.replace('User_', '')}`,
      },
      email: user.email,
      userID: user.id,
      objectType: ObjectTypes.UserProfile,
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    }
  }
}
