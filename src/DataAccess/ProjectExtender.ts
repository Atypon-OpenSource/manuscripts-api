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

import { Model, Project, objectTypes } from '@manuscripts/transform'
import { Prisma, PrismaClient } from '@prisma/client'
import _ from 'lodash'
import { v4 as uuid_v4 } from 'uuid'

import { DatabaseError, ValidationError } from '../Errors'
import { timestamp } from '../Utilities/JWT/LoginTokenPayload'

// TODO: change containerID to projectID
export class ProjectExtender {
  constructor(private readonly prisma: PrismaClient) {}
  readonly PROJECT_MODEL = 'project'
  private extensions: ReturnType<typeof this.buildExtensions>

  getExtension() {
    this.extensions = this.buildExtensions()
    return this.extend()
  }
  private buildExtensions() {
    return {
      userProjects: this.userProjects,
      createProject: this.createProject,
      createManuscript: this.createManuscript,
      updateManuscript: this.updateManuscript,
      bulkInsert: this.bulkInsert,
      removeWithAllResources: this.removeWithAllResources,
      getProject: this.getProject,
      removeAll: this.removeAll,
      getProjectResources: this.getProjectResources,
      getProjectResourcesIDs: this.getProjectResourcesIDs,
      patch: this.patch,
    }
  }

  private extend() {
    return Prisma.defineExtension({
      name: this.PROJECT_MODEL,
      model: {
        [this.PROJECT_MODEL]: this.extensions,
      },
    })
  }

  private userProjects = async (userID: string) => {
    const projects = await this.prisma.project.findMany({
      where: {
        data: {
          path: ['objectType'],
          equals: objectTypes.Project,
        },
        OR: [
          { data: { path: ['owners'], array_contains: userID } },
          { data: { path: ['writers'], array_contains: userID } },
          { data: { path: ['viewers'], array_contains: userID } },
        ],
      },
    })
    return projects.map((project) => {
      return { ...this.buildModel(project) } as Project
    })
  }
  private createProject = async (userID: string, title?: string) => {
    const model = this.createProjectModel(userID, title)
    try {
      const res = await this.prisma.project.create({
        data: model,
      })
      return this.buildModel(res)
    } catch (error) {
      throw DatabaseError.fromPrismaError(
        error,
        `error when creating object of type ${objectTypes.Project}`,
        JSON.stringify(model)
      )
    }
  }

  private createManuscript = async (
    projectID: string,
    prototype?: string,
    manuscriptID?: string
  ) => {
    const model = this.createManuscriptModel(projectID, prototype, manuscriptID)
    try {
      const res = await this.prisma.project.create({
        data: model,
      })
      return this.buildModel(res)
    } catch (error) {
      throw DatabaseError.fromPrismaError(
        error,
        `error when creating object of type ${objectTypes.Manuscript}`,
        JSON.stringify(model)
      )
    }
  }

  private updateManuscript = async (id: string, dataToPatch: any) => {
    const document = await this.getProject(id)
    if (!id) {
      throw new ValidationError(`Document with id ${id} does not exist`, id)
    }
    const patchedDocument = _.mergeWith(
      document,
      dataToPatch,
      (_documentValue: any, patchValue: any) => patchValue
    ) as any

    if (patchedDocument.objectType !== objectTypes.Manuscript) {
      throw new ValidationError(`Object type mismatched`, patchedDocument.objectType)
    }
    const documentToUpdate = {
      id: patchedDocument._id,
      data: {
        ...patchedDocument,
        updatedAt: timestamp(),
      },
    } as any

    const updatedModel = await this.prisma.project.update({
      where: {
        id,
      },
      data: documentToUpdate,
    })
    return this.buildModel(updatedModel)
  }

  private bulkInsert = async (docs: any) => {
    const batch = []
    for (const doc of docs) {
      batch.push({ id: doc._id, data: doc })
    }
    return await this.prisma.project.createMany({ data: batch })
  }

  private removeWithAllResources = async (projectID: string) => {
    //containerID is the same as projectID
    await this.prisma.project.deleteMany({
      where: {
        OR: [
          { id: projectID },
          {
            data: {
              path: ['containerID'],
              equals: projectID,
            },
          },
        ],
      },
    })
  }

  private getProject = async (projectID: string) => {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectID,
      },
    })
    return this.buildModel(project)
  }

  private removeAll = async (projectID: string) => {
    //containerID is the same as projectID
    await this.prisma.project.deleteMany({
      where: {
        data: {
          path: ['containerID'],
          equals: projectID,
        },
      },
    })
  }
  private getProjectResources = async (projectID: string, types?: string[]) => {
    const project = await this.getProject(projectID)
    if (!project) {
      return null
    }
    //containerID is the same as projectID
    const results = await this.prisma.project.findMany({
      where: {
        data: {
          path: ['containerID'],
          equals: projectID,
        },
      },
    })

    const docs = results.map((result: any) => ({ ...result.data, _id: result.id } as Model))
    const projectResources = [project as any, ...docs]
    if (types && types.length > 0) {
      const typeSet = new Set(types)
      return projectResources.filter((doc: Model) => typeSet.has(doc.objectType))
    }
    return projectResources
  }

  private getProjectResourcesIDs = async (projectID: string) => {
    const project = await this.getProject(projectID)
    if (!project) {
      return null
    }
    //containerID is the same as projectID
    const results = await this.prisma.project.findMany({
      where: {
        data: {
          path: ['containerID'],
          equals: projectID,
        },
      },
    })

    const docs = results.map((result: any) => ({ _id: result.id } as Model))
    const projectResources = [project as any, ...docs]

    return projectResources
  }

  private patch = async (id: string, dataToPatch: any) => {
    const document = await this.getProject(id)
    if (!document) {
      throw new ValidationError(`Document with id ${id} does not exist`, id)
    }
    const patchedDocument = _.mergeWith(
      document,
      dataToPatch,
      (_documentValue: any, patchValue: any) => patchValue
    ) as any

    if (patchedDocument.objectType !== objectTypes.Project) {
      throw new ValidationError(`Object type mismatched`, patchedDocument.objectType)
    }
    const documentToUpdate = {
      id: patchedDocument._id,
      data: {
        ...patchedDocument,
        updatedAt: timestamp(),
      },
    } as any

    const updatedModel = await this.prisma.project.update({
      where: {
        id,
      },
      data: documentToUpdate,
    })
    return this.buildModel(updatedModel)
  }
  private projectID() {
    return `${objectTypes.Project}:${uuid_v4()}`
  }
  private manuscriptID() {
    return `${objectTypes.Manuscript}:${uuid_v4()}`
  }
  private createProjectModel(userID: string, title?: string) {
    const createdAt = timestamp()
    const projectID = this.projectID()
    return {
      id: projectID,
      data: {
        _id: projectID,
        owners: [userID],
        writers: [],
        viewers: [],
        title,
        objectType: objectTypes.Project,
        createdAt,
        updatedAt: createdAt,
      },
    }
  }
  private createManuscriptModel(
    projectID: string,
    prototype?: string,
    manuscriptID = this.manuscriptID()
  ) {
    const createdAt = timestamp()
    //containerID is the same as projectID
    return {
      id: manuscriptID,
      data: {
        _id: manuscriptID,
        containerID: projectID,
        prototype,
        objectType: objectTypes.Manuscript,
        createdAt,
        updatedAt: createdAt,
      },
    }
  }
  private buildModel(data: any) {
    if (data && data.data) {
      data.data._id = data.id || data._id
      return data.data
    }
    return data
  }
}
