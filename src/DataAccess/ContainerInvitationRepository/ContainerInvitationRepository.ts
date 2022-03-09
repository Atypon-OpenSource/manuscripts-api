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

import { ContainerInvitation } from '@manuscripts/manuscripts-json-schema'

import { SGRepository } from '../SGRepository'
import { ContainerInvitationLike } from '../Interfaces/Models'
// import { selectN1QLQuery } from '../DatabaseResponseFunctions'
import { PatchContainerInvitation } from '../../Models/ContainerModels'
import { User } from '../../Models/UserModels'

/**
 * Manages tokens persistent storage operations.
 */
export class ContainerInvitationRepository extends SGRepository<
  ContainerInvitationLike,
  ContainerInvitationLike,
  ContainerInvitationLike,
  PatchContainerInvitation
> {
  public get objectType(): string {
    return 'MPContainerInvitation'
  }

  public async getInvitationsForUser(
    containerID: string,
    userEmail: string
  ): Promise<ContainerInvitation[]> {
    /*const n1ql = `SELECT META().id, META().xattrs._sync, * FROM ${this.bucketName} WHERE objectType = \"${this.objectType}\" AND invitedUserEmail = $1 AND containerID = $2`

    const callbackFn = (results: any) => results.map((result: any) => {
      delete result[this.bucketName]._sync
      return {
        ...result[this.bucketName],
        _id: result.id
      } as ContainerInvitation
    })

    return selectN1QLQuery<ContainerInvitation[]>(this.database.bucket, n1ql, [userEmail, containerID], callbackFn)*/

    const Q = {
      AND: [
        {
          data: {
            path: ['objectType'],
            equals: this.objectType,
          },
        },
        {
          data: {
            path: ['invitedUserEmail'],
            equals: userEmail,
          },
        },
        {
          data: {
            path: ['containerID'],
            equals: containerID,
          },
        },
      ],
    }

    const callbackFn = (results: any) =>
      results.map((result: any) => {
        return { ...this.buildModel(result) } as ContainerInvitation
      })

    return this.database.bucket.query(Q).then((res: any) => callbackFn(res))
  }

  public async deleteInvitations(containerID: string, user: User): Promise<void> {
    const invitations = await this.getInvitationsForUser(containerID, user.email)

    for (let invitation of invitations) {
      await this.remove(invitation._id)
    }
  }

  public async getAllByEmail(email: string) {
    /*const n1ql = `SELECT META().id, * FROM ${this.bucketName} WHERE objectType = \'${this.objectType}\' AND invitedUserEmail = $1 AND _deleted IS MISSING`

    const callbackFn = (results: any) => results.map((result: any) => {
      const obj = {
        ...result[this.bucketName],
        _id: result.id
      }
      return obj
    })

    return selectN1QLQuery<ContainerInvitation[]>(this.database.bucket, n1ql, [email], callbackFn)*/

    const Q = {
      AND: [
        {
          data: {
            path: ['objectType'],
            equals: this.objectType,
          },
        },
        {
          data: {
            path: ['invitedUserEmail'],
            equals: email,
          },
        },
        /*{
          data: {
            path: ["_deleted"],
            equals: undefined
          }
        }*/
      ],
    }

    const callbackFn = (results: any) =>
      results.map((result: any) => {
        return { ...this.buildModel(result) } as ContainerInvitation
      })

    return this.database.bucket.query(Q).then((res: any) => callbackFn(res))
  }
}
