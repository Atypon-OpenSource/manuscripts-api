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
import { ExternalFile, ObjectTypes } from '@manuscripts/manuscripts-json-schema'
class ExternalFileRepository extends SGRepository<any, any, any, any> {
  public get objectType(): string {
    return 'MPExternalFile'
  }

  public async findByContainerIDAndPublicUrl(
    containerID: string,
    manuscriptID: string,
    publicUrl: string
  ): Promise<ExternalFile> {
    const Q = {
      AND: [
        {
          data: {
            path: ['containerID'],
            equals: containerID,
          },
        },
        {
          data: {
            path: ['manuscriptID'],
            equals: manuscriptID,
          },
        },
        {
          data: {
            path: ['publicUrl'],
            equals: publicUrl,
          },
        },
        {
          data: {
            path: ['objectType'],
            equals: ObjectTypes.ExternalFile,
          },
        },
      ],
    } as any

    if (manuscriptID) {
      Q.AND.push({
        data: {
          path: ['manuscriptID'],
          equals: manuscriptID,
        },
      })
    }

    return this.database.bucket.query(Q).then((res: any) => {
      if (!res.length) {
        return undefined
      }
      return res
    })
  }
}

export { ExternalFileRepository }
