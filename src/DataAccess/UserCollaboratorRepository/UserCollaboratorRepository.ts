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

// import { N1qlQuery, CouchbaseError } from 'couchbase'

import { SGRepository } from '../SGRepository'
import { GatewayOptions } from '../Interfaces/KeyValueRepository'
import { MethodNotAllowedError /*, DatabaseError*/ } from '../../Errors'
import { UserCollaborator } from '@manuscripts/manuscripts-json-schema'

export class UserCollaboratorRepository extends SGRepository<
  UserCollaborator,
  UserCollaborator,
  UserCollaborator,
  UserCollaborator
> {
  public get objectType(): string {
    return 'MPUserCollaborator'
  }

  public async update(
    _id: string,
    _updatedDocument: any,
    _updateOptions: GatewayOptions
  ): Promise<any> {
    throw new MethodNotAllowedError('UserCollaboratorRepository', 'update')
  }

  public async clearUserCollaborators(userId: string): Promise<void> {
    const userCollaborators = await this.getByUserId(userId)

    for (const userCollaborator of userCollaborators) {
      await this.purge(userCollaborator._id)
    }
  }
  /**
   * Get user collaborator by user id.
   * @param userId user id.
   */
  public async getByUserId(userId: string): Promise<UserCollaborator[]> {
    const Q = {
      AND: [
        {
          data: {
            path: ['objectType'],
            equals: this.objectType,
          },
        },
        {
          OR: [
            {
              data: {
                path: ['userID'],
                equals: userId,
              },
            },
            {
              data: {
                path: ['collaboratorProfile', 'data', 'userID'],
                equals: userId,
              },
            },
          ],
        },
      ],
    }

    return this.database.bucket.query(Q).then((res: any) => res.map((i: any) => this.buildModel(i)))
  }
}
