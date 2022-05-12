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

import { Model } from '@manuscripts/manuscripts-json-schema'
import { selectActiveResources } from '@manuscripts/manuscripts-json-schema-utils'

import { SGRepository } from '../SGRepository'
import {
  DocumentIdentifyingMetadata,
  IContainerRepository,
} from '../Interfaces/IContainerRepository'

export abstract class ContainerRepository<Container, ContainerLike, PatchContainer>
  extends SGRepository<Container, ContainerLike, ContainerLike, PatchContainer>
  implements IContainerRepository<Container, ContainerLike, PatchContainer>
{
  public async getUserContainers(userID: string) {
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
                path: ['owners'],
                array_contains: userID,
              },
            },
            {
              data: {
                path: ['writers'],
                array_contains: userID,
              },
            },
            {
              data: {
                path: ['viewers'],
                array_contains: userID,
              },
            },
          ],
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
        return { ...this.buildModel(result) } as Container
      })

    return this.database.bucket.query(Q).then((res: any) => callbackFn(res))
  }

  public async getContainerResources(
    containerId: string,
    manuscriptID: string | null,
    allowOrphanedDocs?: boolean,
    types?: string[]
  ) {
    const container = await this.getById(containerId)
    if (!container) {
      return null
    }

    const callbackFn = (results: any) => {
      const otherDocs = results.map(
        (result: any) => ({ ...this.buildModel(result), _id: result.id } as Model)
      )

      const activeResources =
        containerId.startsWith(`${this.objectType}:`) && !allowOrphanedDocs
          ? selectActiveResources([container, ...otherDocs])
          : [container, ...otherDocs]

      if (types && types.length > 0) {
        const typeSet = new Set(types)
        return activeResources.filter((doc: Model) => typeSet.has(doc.objectType))
      }
      return activeResources
    }

    const Q = {
      OR: [
        {
          data: {
            path: ['containerID'],
            equals: containerId,
          },
        },
        {
          AND: [
            {
              data: {
                path: ['projectID'],
                equals: containerId,
              },
            },
            {
              OR: [
                {
                  data: {
                    path: ['objectType'],
                    equals: 'MPUserProject',
                  },
                },
                {
                  data: {
                    path: ['objectType'],
                    equals: 'MPProjectInvitation',
                  },
                },
              ],
            },
          ],
        },
      ],
    } as any

    if (manuscriptID) {
      Q.OR[1].AND.push({
        OR: [
          {
            data: {
              path: ['manuscriptID'],
              equals: manuscriptID,
            },
          },
          {
            data: {
              path: ['id'],
              equals: manuscriptID,
            },
          },
        ],
      })
    }

    return this.database.bucket.query(Q).then((res: any) => callbackFn(res))
  }

  public async getContainerResourcesIDs(containerId: string, types?: string[]) {
    const container = await this.getById(containerId)
    if (!container) {
      return null
    }

    const callbackFn = (results: any) => {
      const otherDocs = results.map((result: any) => ({ _id: result.id } as Model))

      const activeResources = containerId.startsWith(`${this.objectType}:`)
        ? selectActiveResources([container, ...otherDocs])
        : [container, ...otherDocs]

      if (types && types.length > 0) {
        const typeSet = new Set(types)
        return activeResources.filter((doc: Model) => typeSet.has(doc.objectType))
      }
      return activeResources
    }

    const Q = {
      OR: [
        {
          data: {
            path: ['containerID'],
            equals: containerId,
          },
        },
        {
          AND: [
            {
              data: {
                path: ['projectID'],
                equals: containerId,
              },
            },
            {
              OR: [
                {
                  data: {
                    path: ['objectType'],
                    equals: 'MPUserProject',
                  },
                },
                {
                  data: {
                    path: ['objectType'],
                    equals: 'MPProjectInvitation',
                  },
                },
              ],
            },
          ],
        },
      ],
    }

    return this.database.bucket.query(Q).then((res: any) => callbackFn(res))
  }

  /**
   * Overriding the remove method to make it delete all related resources.
   * @param id The Id of a container.
   */
  public async removeWithAllResources(id: string): Promise<void> {
    const containerResources = await this.getContainerResourcesMetadata(id)

    for (const resource of containerResources) {
      await this.purge(resource.id)
    }
    await this.purge(id)
  }

  private getContainerResourcesMetadata(
    containerId: string
  ): Promise<DocumentIdentifyingMetadata[]> {
    const Q = {
      OR: [
        {
          data: {
            path: ['projectId'],
            equals: containerId,
          },
        },
        {
          data: {
            path: ['containerID'],
            equals: containerId,
          },
        },
      ],
    }

    return this.database.bucket.findMany(Q)
  }

  /**
   * Get all container resources attachments and return map with document id as key and the attachments as the map value.
   */
  public async getContainerAttachments(containerID: string, manuscriptID: string | null) {
    const container = await this.getById(containerID)
    if (!container) {
      return null
    }

    const callbackFn = (results: any) => {
      const attachments: Map<string, any> = new Map()

      for (let index = 0; index < results.length; index++) {
        attachments.set(results[index].id, results[index].attachments)
      }
      return attachments
    }

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
            path: ['attachments'],
            not: [],
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

    return this.database.bucket.query(Q).then((res: any) => callbackFn(res))
  }

  public async findTemplatesInContainer(containerId: string) {
    const Q = {
      AND: [
        {
          data: {
            path: ['objectType'],
            equals: 'MPManuscriptTemplate',
          },
        },
        {
          data: {
            path: ['containerID'],
            equals: containerId,
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

    const callbackFn = (results: any) => {
      return results.map((row: any) => ({
        ...this.buildModel(row),
      }))
    }

    return this.database.bucket.query(Q).then((res: any) => callbackFn(res))
  }

  public async findModelsInTemplate(containerId: string, templateId: string) {
    const Q = {
      AND: [
        {
          data: {
            path: ['templateID'],
            equals: templateId,
          },
        },
        {
          data: {
            path: ['containerID'],
            equals: containerId,
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

    const callbackFn = (results: any) => {
      return results.map((row: any) => ({
        ...this.buildModel(row),
      }))
    }

    return this.database.bucket.query(Q).then((res: any) => callbackFn(res))
  }

  public buildItem = (row: any) => {
    const { _sync, sessionID, containerID, templateID, ...item } = row.projects
    return { ...item, _id: row.id }
  }
}
