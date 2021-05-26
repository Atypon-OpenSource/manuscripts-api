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

import {
  Model,
  ManuscriptTemplate,
  LibraryCollection
} from '@manuscripts/manuscripts-json-schema'
import { selectActiveResources } from '@manuscripts/manuscripts-json-schema-utils'
import request from 'request-promise-native'
import * as HttpStatus from 'http-status-codes'

import { SGRepository } from '../SGRepository'
import { GatewayInaccessibleError, SyncError } from '../../Errors'
import { SYNC_GATEWAY_COOKIE_NAME } from '../../DomainServices/Sync/SyncService'
import { selectN1QLQuery } from '../DatabaseResponseFunctions'
import {
  appDataPublicGatewayURI,
  appDataAdminGatewayURI
} from '../../Config/ConfigAccessors'
import {
  DocumentIdentifyingMetadata,
  IContainerRepository
} from '../Interfaces/IContainerRepository'

export abstract class ContainerRepository<
    Container,
    ContainerLike,
    PatchContainer
  >
  extends SGRepository<Container, ContainerLike, ContainerLike, PatchContainer>
  implements IContainerRepository<Container, ContainerLike, PatchContainer> {
  public async getUserContainers (userID: string) {
    const existIn = (arrayName: string) =>
      `ANY id IN ${arrayName} SATISFIES id = $1 END`

    const n1ql = `SELECT *, META().id FROM ${
      this.bucketName
    } WHERE objectType = \'${this.objectType}\' AND (${existIn(
      'owners'
    )} OR ${existIn('writers')} OR ${existIn(
      'viewers'
    )}) AND _deleted IS MISSING`

    const callbackFn = (results: any) =>
      results.map((result: any) => {
        delete result[this.bucketName]._sync
        return { ...result[this.bucketName], _id: result.id } as Container
      })

    return selectN1QLQuery<Container[]>(
      this.database.bucket,
      n1ql,
      [userID],
      callbackFn
    )
  }

  public async getContainerResources (
    containerId: string,
    manuscriptID: string | null,
    allowOrphanedDocs?: boolean
  ) {
    const container = await this.getById(containerId)
    if (!container) {
      return null
    }

    // Index selection for a query solely depends on the filter on the where statement, and
    // since containerID is a partial index we are adding objectTypes explicitly
    let n1ql = `SELECT *, META().id FROM ${this.bucketName} WHERE containerID = $1 OR (projectID = $1 and objectType in ['MPUserProject','MPProjectInvitation'])`

    if (manuscriptID) {
      n1ql +=
        ' and (manuscriptID = $2  or Meta().id = $2 or manuscriptID is missing)'
    }

    const callbackFn = (results: any) => {
      const otherDocs = results.map(
        (result: any) =>
          ({ ...result[this.bucketName], _id: result.id } as Model)
      )

      return containerId.startsWith(`${this.objectType}:`) && !allowOrphanedDocs
        ? selectActiveResources([container, ...otherDocs])
        : [container, ...otherDocs]
    }

    return selectN1QLQuery<Model[]>(
      this.database.bucket,
      n1ql,
      [containerId, manuscriptID],
      callbackFn
    )
  }

  public async getContainerResourcesIDs (containerId: string) {
    const container = await this.getById(containerId)
    if (!container) {
      return null
    }

    // Index selection for a query solely depends on the filter on the where statement, and
    // since containerID is a partial index we are adding objectTypes explicitly
    const n1ql = `SELECT META().id FROM ${this.bucketName} WHERE containerID = $1 OR (projectID = $1 and objectType in ['MPUserProject','MPProjectInvitation'])`

    const callbackFn = (results: any) => {
      const otherDocs = results.map(
        (result: any) => ({ _id: result.id } as Model)
      )

      return containerId.startsWith(`${this.objectType}:`)
        ? selectActiveResources([container, ...otherDocs])
        : [container, ...otherDocs]
    }

    return selectN1QLQuery<Model[]>(
      this.database.bucket,
      n1ql,
      [containerId],
      callbackFn
    )
  }

  /**
   * Overriding the remove method to make it delete all related resources.
   * @param id The Id of a container.
   */
  public async removeWithAllResources (id: string): Promise<void> {
    const containerResources = await this.getContainerResourcesMetadata(id)

    for (const resource of containerResources) {
      await this.purge(resource.id)
    }
    await this.purge(id)
  }

  private getContainerResourcesMetadata (
    containerId: string
  ): Promise<DocumentIdentifyingMetadata[]> {
    const n1ql = `SELECT META().id, _sync.rev FROM ${this.bucketName} WHERE projectID = $1 OR containerID = $1`

    const callbackFn = (results: any) => results

    return selectN1QLQuery<DocumentIdentifyingMetadata[]>(
      this.database.bucket,
      n1ql,
      [containerId],
      callbackFn
    )
  }

  // TODO:: should cover in the tests
  /* istanbul ignore next */
  public async removeContainerResources (
    containerId: string,
    syncSession: string
  ) {
    const containerResources = await this.getContainerResourcesMetadata(
      containerId
    )

    for (const resource of containerResources) {
      let uri
      let headers
      let response: any

      if (
        !resource.id.startsWith('MPContainerInvitation:') &&
        !resource.id.startsWith('MPContainerRequest:')
      ) {
        try {
          if (resource.id.startsWith('MPUserProject:')) {
            uri = `${appDataAdminGatewayURI(this.bucketKey)}/${
              resource.id
            }?rev=${resource.rev}`
          } else {
            uri = `${appDataPublicGatewayURI(this.bucketKey)}/${
              resource.id
            }?rev=${resource.rev}`

            headers = {
              cookie: `${SYNC_GATEWAY_COOKIE_NAME}=${syncSession}`
            }
          }

          const options = {
            method: 'DELETE',
            uri,
            headers,
            json: true,
            resolveWithFullResponse: true,
            simple: false
          }

          response = await request(options)
        } catch (error) {
          throw new GatewayInaccessibleError(
            `Request to URL ${uri} is failing`
          )
        }

        if (
          response.statusCode !== HttpStatus.OK &&
          response.statusCode !== HttpStatus.NOT_FOUND
        ) {
          throw new SyncError(
            `Failed to delete SyncGateway document (${uri}: ${response.statusCode})`,
            response
          )
        }
      } else {
        await this.remove(resource.id)
      }
    }
  }

  /**
   * Get all container resources attachments and return map with document id as key and the attachments as the map value.
   */
  public async getContainerAttachments (
    containerID: string,
    manuscriptID: string | null
  ) {
    const container = await this.getById(containerID)
    if (!container) {
      return null
    }

    let n1ql = `SELECT _sync.attachments, META().id FROM ${this.bucketName} WHERE containerID = $1 AND _sync.attachments is not missing`

    if (manuscriptID) {
      n1ql += ` AND (manuscriptID = $2 or manuscriptID is missing)`
    }

    const callbackFn = (results: any) => {
      const attachments: Map<string, any> = new Map()

      for (let index = 0; index < results.length; index++) {
        attachments.set(results[index].id, results[index].attachments)
      }
      return attachments
    }

    return selectN1QLQuery<any>(
      this.database.bucket,
      n1ql,
      [containerID, manuscriptID],
      callbackFn
    )
  }

  public async findTemplatesInContainer (containerId: string) {
    const n1ql = `SELECT *, META().id FROM \`${this.bucketName}\` WHERE objectType = 'MPManuscriptTemplate' AND containerID = $1 AND _deleted IS MISSING`

    const callbackFn = (results: any) => results.map(this.buildItem)

    return selectN1QLQuery<ManuscriptTemplate[]>(
      this.database.bucket,
      n1ql,
      [containerId],
      callbackFn
    )
  }

  public async findModelsInTemplate (containerId: string, templateId: string) {
    const n1ql = `SELECT *, META().id FROM \`${this.bucketName}\` WHERE containerID = $1 AND templateID = $2 AND _deleted IS MISSING`

    const callbackFn = (results: any) => results.map(this.buildItem)

    return selectN1QLQuery<Model[]>(
      this.database.bucket,
      n1ql,
      [containerId, templateId],
      callbackFn
    )
  }

  public buildItem = (row: any) => {
    const { _sync, sessionID, containerID, templateID, ...item } = row.projects
    return { ...item, _id: row.id }
  }

  public getContainedLibraryCollections (
    containerId: string
  ): Promise<LibraryCollection[]> {
    const n1ql = `SELECT *, META().id, _sync.rev FROM \`${this.bucketName}\` WHERE objectType = 'MPLibraryCollection' AND containerID = $1 AND _deleted IS MISSING`

    const callbackFn = (results: any) => {
      return results.map((row: any) => ({
        ...this.buildItem(row),
        _rev: row.rev
      }))
    }

    return selectN1QLQuery<LibraryCollection[]>(
      this.database.bucket,
      n1ql,
      [containerId],
      callbackFn
    )
  }
}
