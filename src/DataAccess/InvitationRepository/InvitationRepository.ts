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

import { Invitation } from '@manuscripts/manuscripts-json-schema'
import { PatchInvitation } from 'src/Models/InvitationModels'

import { selectN1QLQuery } from '../DatabaseResponseFunctions'
import { InvitationLike } from '../Interfaces/Models'
import { SGRepository } from '../SGRepository'

/**
 * Manages invitation persistent storage operations.
 */
export class InvitationRepository extends SGRepository<
  InvitationLike,
  InvitationLike,
  InvitationLike,
  PatchInvitation
> {
  public get objectType (): string {
    return 'MPInvitation'
  }

  public async getAllByEmail (email: string) {
    const n1ql = `SELECT META().id, * FROM ${this.bucketName} WHERE objectType = \'${this.objectType}\' AND invitedUserEmail = $1 AND _deleted IS MISSING`

    const callbackFn = (results: any) => results.map((result: any) => {
      const obj = {
        ...result[this.bucketName],
        _id: result.id
      }
      return obj
    })

    return selectN1QLQuery<Invitation[]>(this.database.bucket, n1ql, [email], callbackFn)
  }
}
