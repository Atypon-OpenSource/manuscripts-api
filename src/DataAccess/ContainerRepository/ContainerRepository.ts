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

import { Model } from '@manuscripts/json-schema'

import { IContainerRepository } from '../Interfaces/IContainerRepository'
import { IdentifiableEntity } from '../Interfaces/IdentifiableEntity'
import { SGRepository } from '../SGRepository'
import { proceedWithReadAccess } from '../syncAccessControl'

export abstract class ContainerRepository<
    Container extends Partial<IdentifiableEntity>,
    ContainerLike extends Partial<IdentifiableEntity>,
    PatchContainer
  >
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

      const projectResources = [container, ...otherDocs]

      if (types && types.length > 0) {
        const typeSet = new Set(types)
        return projectResources.filter((doc: Model) => typeSet.has(doc.objectType))
      }
      return projectResources
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

      const projectResources = [container, ...otherDocs]

      if (types && types.length > 0) {
        const typeSet = new Set(types)
        return projectResources.filter((doc: Model) => typeSet.has(doc.objectType))
      }
      return projectResources
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
  public async removeAllResources(id: string): Promise<void> {
    const Q = {
      OR: [
        {
          data: {
            path: ['projectID'],
            equals: id,
          },
        },
        {
          data: {
            path: ['containerID'],
            equals: id,
          },
        },
      ],
    }

    await this.database.bucket.remove(Q)
  }

  /**
   * Overriding the remove method to make it delete all related resources.
   * plus the container itself
   * @param id The Id of a container.
   */
  public async removeWithAllResources(id: string): Promise<void> {
    await this.removeAllResources(id)
    await this.purge(id)
  }

  /**
   * deletes a model by id.
   * caution: call this after checking resourceExists
   * and ensuring the caller has access to the container
   * @param id The Id of a model.
   */
  public async removeResource(id: string): Promise<any> {
    const Q = {
      id,
    }

    return this.database.bucket.remove(Q)
  }

  /**
   * checks existence of a model by id inside a container.
   * @param containerID The Id of a container.
   * @param id The Id of a model.
   */
  public async resourceExists(containerID: string, id: string): Promise<boolean> {
    const Q = {
      id,
    }

    const resource = await this.database.bucket.findUnique(Q)
    return resource && (resource.containerID === containerID || resource.projectID === containerID)
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

  public async validateReadAccess(doc: any, userId: string): Promise<void> {
    await proceedWithReadAccess(doc, userId)
  }
}
