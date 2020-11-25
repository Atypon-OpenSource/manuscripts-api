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

import { Model, Project, ManuscriptTemplate } from '@manuscripts/manuscripts-json-schema'
import { selectActiveResources } from '@manuscripts/manuscripts-json-schema-utils'
import { N1qlQuery, CouchbaseError } from 'couchbase'
import request from 'request-promise-native'
import * as HttpStatus from 'http-status-codes'

import { SGRepository } from '../SGRepository'
import {
  IProjectRepository,
  DocumentIdentifyingMetadata
} from '../Interfaces/IProjectRepository'
import { ProjectLike } from '../Interfaces/Models'
import { PatchProject } from '../../Models/ProjectModels'
import { GatewayOptions } from '../Interfaces/KeyValueRepository'
import {
  MethodNotAllowedError,
  DatabaseError,
  GatewayInaccessibleError,
  SyncError,
  ValidationError
} from '../../Errors'
import { SYNC_GATEWAY_COOKIE_NAME } from '../../DomainServices/Sync/SyncService'
import { databaseErrorMessage } from '../DatabaseErrorMessage'
import {
  appDataPublicGatewayURI,
  appDataAdminGatewayURI
} from '../../Config/ConfigAccessors'

export class ProjectRepository
  extends SGRepository<Project, ProjectLike, ProjectLike, PatchProject>
  implements IProjectRepository {
  public get objectType (): string {
    return 'MPProject'
  }

  public async update (
    _id: string,
    _updatedDocument: ProjectLike,
    _updateOptions: GatewayOptions
  ): Promise<Project> {
    throw new MethodNotAllowedError('ProjectRepository', 'update')
  }

  /**
   * Get all projects which a user collaborating on.
   * @param userId user id.
   */
  public async getUserProjects (userID: string) {
    const existIn = (arrayName: string) =>
      `ANY id IN ${arrayName} SATISFIES id = $1 END`

    const n1ql = `SELECT *, META().id FROM ${this.bucketName}
                  WHERE objectType = \'${this.objectType}\'
                  AND (${existIn('owners')}
                  OR ${existIn('writers')}
                  OR ${existIn('viewers')})
                  AND _deleted IS MISSING`

    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(this.n1qlConsistency)

    return new Promise<Project[]>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [userID],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )

            return reject(
              new DatabaseError(error.code, errorMsg, userID, error)
            )
          }

          const projects = results.map((result: any) => {
            delete result[this.bucketName]._sync
            return { ...result[this.bucketName], _id: result.id } as Project
          })

          return resolve(projects)
        }
      )
    })
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

    let n1ql = `SELECT *, META().id FROM ${
      this.bucketName
    } WHERE (projectID = $1 OR containerID = $1)`

    if (manuscriptID) {
      n1ql += ' and (manuscriptID = $2  or Meta().id = $2 or manuscriptID is missing)'
    }

    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(N1qlQuery.Consistency.STATEMENT_PLUS)

    return new Promise<Model[]>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [containerId, manuscriptID],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )

            return reject(
              new DatabaseError(error.code, errorMsg, containerId, error)
            )
          }

          const otherDocs = results.map(
            (result: any) =>
              ({ ...result[this.bucketName], _id: result.id } as Model)
          )

          const resources =
            containerId.startsWith('MPProject:') && !allowOrphanedDocs
              ? selectActiveResources([container, ...otherDocs])
              : [container, ...otherDocs]

          return resolve(resources)
        }
      )
    })
  }

  public async getContainerResourcesIDs (containerId: string) {
    const container = await this.getById(containerId)
    if (!container) {
      return null
    }

    const n1ql = `SELECT META().id FROM ${
      this.bucketName
    } WHERE projectID = $1 OR containerID = $1`

    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(N1qlQuery.Consistency.STATEMENT_PLUS)

    return new Promise<Model[]>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [containerId],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )

            return reject(
              new DatabaseError(error.code, errorMsg, containerId, error)
            )
          }

          const otherDocs = results.map(
            (result: any) =>
              ({ _id: result.id } as Model)
          )

          const resources = containerId.startsWith('MPProject:')
            ? selectActiveResources([container, ...otherDocs])
            : [container, ...otherDocs]

          return resolve(resources)
        }
      )
    })
  }

  /**
   * Overriding the remove method to make it delete all related resources.
   * @param id The Id of a project.
   */
  public async removeWithAllResources (
    id: string
  ): Promise<void> {
    if (!id) {
      throw new ValidationError('Id must be string', id)
    }

    const projectResources = await this.projectResources(id)

    for (const resource of projectResources) {
      await this.purge(resource.id)
    }
    await this.purge(id)
  }

  private projectResources (
    projectId: string
  ): Promise<DocumentIdentifyingMetadata[]> {
    const n1ql = `SELECT META().id, _sync.rev FROM ${
      this.bucketName
    } WHERE projectID = $1 OR containerID = $1`

    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(this.n1qlConsistency)

    return new Promise<DocumentIdentifyingMetadata[]>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [projectId],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )

            return reject(
              new DatabaseError(error.code, errorMsg, projectId, error)
            )
          }

          return resolve(results)
        }
      )
    })
  }

  // TODO:: should cover in the tests
  /* istanbul ignore next */
  public async removeProjectResources (projectId: string, syncSession: string) {
    const projectResources = await this.projectResources(projectId)

    for (const resource of projectResources) {
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
   * Get all project resources attachments and return map with document id as key and the attachments as the map value.
   */
  public async getProjectAttachments (projectId: string, manuscriptID: string | null) {
    const project = await this.getById(projectId)
    if (!project) {
      return null
    }
    let n1ql = `SELECT _sync.attachments ,META().id FROM ${
      this.bucketName
    } WHERE (projectID = $1 OR containerID = $1) AND _sync.attachments is not missing`

    if (manuscriptID) {
      n1ql += ` AND (manuscriptID = $2 or manuscriptID is missing)`
    }

    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(N1qlQuery.Consistency.STATEMENT_PLUS)

    return new Promise<any>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [projectId, manuscriptID],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )

            return reject(
              new DatabaseError(error.code, errorMsg, projectId, error)
            )
          }
          const attachments: Map<string, any> = new Map()

          for (let index = 0; index < results.length; index++) {
            attachments.set(results[index].id, results[index].attachments)
          }
          return resolve(attachments)
        }
      )
    })
  }

  public async findTemplatesInProject (projectId: string) {
    let n1ql = `SELECT *, META().id FROM \`${
      this.bucketName
    }\` WHERE objectType = 'MPManuscriptTemplate' AND containerID = $1 AND _deleted IS MISSING`
    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(N1qlQuery.Consistency.STATEMENT_PLUS)

    return new Promise<ManuscriptTemplate[]>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [projectId],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )
            return reject(
              new DatabaseError(error.code, errorMsg, projectId, error)
            )
          }
          return resolve(results.map(this.buildItem))
        }

      )
    })
  }

  public async findModelsInTemplate (projectId: String, templateId: String) {

    let n1ql = `SELECT *, META().id FROM \`${
      this.bucketName
    }\` WHERE containerID = $1 AND templateID = $2 AND _deleted IS MISSING`

    const statement = N1qlQuery.fromString(n1ql)
      .adhoc(false)
      .consistency(N1qlQuery.Consistency.STATEMENT_PLUS)

    return new Promise<Model[]>((resolve, reject) => {
      this.database.bucket.query(
        statement,
        [projectId, templateId],
        (error: CouchbaseError | null, results: any) => {
          if (error) {
            const errorMsg: string = databaseErrorMessage(
              error.code,
              error.message
            )
            return reject(
              new DatabaseError(error.code, errorMsg, [projectId, templateId], error)
            )
          }
          return resolve(results.map(this.buildItem))
        }

      )
    })
  }

  public buildItem = (row: any) => {
    const { _sync, sessionID, containerID, templateID, ...item } = row.projects
    return { ...item, _id: row.id }
  }

}
