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

import { SGRepository } from '../SGRepository'
import { DatabaseError } from '../../Errors'
import { CorrectionLike } from '../Interfaces/Models'
import { Correction } from '@manuscripts/manuscripts-json-schema/dist/types'
import { Prisma } from '@prisma/client'

class CorrectionRepository extends SGRepository<
  Correction,
  CorrectionLike,
  CorrectionLike,
  Partial<Correction>
> {
  public get objectType(): string {
    return 'MPCorrection'
  }

  public async getCorrectionStatus(containerID: string) {
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
            path: ['containerID'],
            equals: containerID,
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

    return this.database.bucket
      .query(Q)
      .catch((error: Prisma.PrismaClientKnownRequestError) =>
        Promise.reject(
          DatabaseError.fromPrismaError(
            error,
            `Error getProductionNotes of type ${this.objectType}`,
            JSON.stringify(Q)
          )
        )
      )
      .then((results: any) => {
        const groupByStatus = results.reduce((objectsByKeyValue: any, object: any) => {
          const obj = this.buildModel(object)
          const value = obj['status']['label']
          objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj)
          return objectsByKeyValue
        }, {})
        let status: any = {}
        for (const [key, value] of Object.entries(groupByStatus)) {
          const items = value as []
          status[key] = items.length
        }
        return status
      })
  }
}

export { CorrectionRepository }
