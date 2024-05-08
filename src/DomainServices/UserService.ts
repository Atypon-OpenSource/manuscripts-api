/*!
 * © 2024 Atypon Systems LLC
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

import { User } from '@prisma/client'
import jwt from 'jsonwebtoken'

import { ProjectClient, UserClient } from '../DataAccess/Repository'
import { AccountNotFoundError, InvalidCredentialsError, RecordNotFoundError } from '../Errors'
import { TokenPayload } from '../Models/UserModels'

export class UserService {
  constructor(
    private readonly userRepository: UserClient,
    private readonly projectRepository: ProjectClient
  ) {}

  public async profile(token: string) {
    const payload = jwt.decode(token)
    if (!this.isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }
    const user = await this.userRepository.findByID(payload.userID)
    return user
      ? {
          email: user.email,
          userID: user.userID,
          bibliographicName: {
            given: user.given,
            family: user.family,
          },
        }
      : null
  }
  private isLoginTokenPayload(obj: string | object | null): obj is TokenPayload {
    if (!obj) {
      return false
    }
    if (typeof obj === 'string') {
      return false
    }

    return (
      (obj as any).userID &&
      typeof (obj as any).userID === 'string' &&
      (obj as any).deviceID &&
      typeof (obj as any).deviceID === 'string' &&
      (obj as any).appID &&
      typeof (obj as any).appID === 'string'
    )
  }

  public async getProjectUserProfiles(projectID: string): Promise<User[]> {
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
      users.push(user)
    }
    return users
  }

  public async getUserProjects(userID: string) {
    return await this.projectRepository.userProjects(userID)
  }
}
