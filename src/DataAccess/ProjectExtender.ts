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

import { Model, ObjectTypes, Project } from '@manuscripts/json-schema'
import { Prisma, PrismaClient } from '@prisma/client'
import _ from 'lodash'
import { v4 as uuid_v4 } from 'uuid'

import { DatabaseError, ValidationError } from '../Errors'
import { timestamp } from '../Utilities/JWT/LoginTokenPayload'

export class ProjectExtender {
  static readonly PROJECT_MODEL = 'project'
  static readonly objectType = ObjectTypes.Project
  private static prisma: PrismaClient
  private static extensions: ReturnType<typeof this.buildExtensions>

  static getExtension(prisma: PrismaClient) {
    this.prisma = prisma
    this.extensions = this.buildExtensions()
    return this.extend()
  }
  private static buildExtensions() {
    return {
      userProjects: this.userProjects(),
      createProject: this.createProject(),
      createManuscript: this.createManuscript(),
      bulkInsert: this.bulkInsert(),
      removeWithAllResources: this.removeWithAllResources(),
      getProject: this.getProject(),
      removeAll: this.removeAll(),
      getProjectResources: this.getProjectResources(),
      getProjectResourcesIDs: this.getProjectResourcesIDs(),
      patch: this.patch(),
    }
  }

  private static extend() {
    return Prisma.defineExtension({
      name: this.PROJECT_MODEL,
      model: {
        [this.PROJECT_MODEL]: this.extensions,
      },
    })
  }

  private static userProjects() {
    return async (userID: string) => {
      const projects = await this.prisma.project.findMany({
        where: {
          data: {
            path: ['objectType'],
            equals: this.objectType,
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
  }
  private static createProject() {
    return async (userID: string, title?: string) => {
      const model = this.createProjectModel(userID, title)
      try {
        const res = await this.prisma.project.create({
          data: model,
        })
        return this.buildModel(res)
      } catch (error) {
        throw DatabaseError.fromPrismaError(
          error,
          `error when creating object of type ${ObjectTypes.Project}`,
          JSON.stringify(model)
        )
      }
    }
  }

  private static createManuscript() {
    return async (projectID: string, prototype?: string) => {
      const model = this.createManuscriptModel(projectID, prototype)
      try {
        const res = await this.prisma.project.create({
          data: model,
        })
        return this.buildModel(res)
      } catch (error) {
        throw DatabaseError.fromPrismaError(
          error,
          `error when creating object of type ${ObjectTypes.Manuscript}`,
          JSON.stringify(model)
        )
      }
    }
  }

  private static bulkInsert() {
    return async (docs: any) => {
      const batch = []
      for (const doc of docs) {
        batch.push({ id: doc._id, data: doc })
      }
      return await this.prisma.project.createMany({ data: batch })
    }
  }

  private static removeWithAllResources() {
    return async (projectID: string) => {
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
  }

  private static getProject() {
    return async (projectID: string) => {
      const project = await this.prisma.project.findUnique({
        where: {
          id: projectID,
        },
      })
      return this.buildModel(project)
    }
  }

  private static removeAll() {
    return async (projectID: string) => {
      await this.prisma.project.deleteMany({
        where: {
          data: {
            path: ['containerID'],
            equals: projectID,
          },
        },
      })
    }
  }
  private static getProjectResources() {
    return async (projectID: string, types?: string[]) => {
      const project = await this.getProject()(projectID)
      if (!project) {
        return null
      }

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
  }

  private static getProjectResourcesIDs() {
    return async (projectID: string) => {
      const project = await this.getProject()(projectID)
      if (!project) {
        return null
      }

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
  }

  private static patch() {
    return async (id: string, dataToPatch: any) => {
      const document = await this.getProject()(id)
      if (!document) {
        throw new ValidationError(`Document with id ${id} does not exist`, id)
      }
      const patchedDocument = _.mergeWith(
        document,
        dataToPatch,
        (_documentValue: any, patchValue: any) => patchValue
      ) as any

      if (patchedDocument.objectType !== this.objectType) {
        throw new ValidationError(`Object type mismatched`, patchedDocument.objectType)
      }
      const documentToUpdate = {
        id: patchedDocument._id,
        data: {
          updatedAt: timestamp(),
          ...patchedDocument,
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
  }
  private static projectID() {
    return `${ObjectTypes.Project}:${uuid_v4()}`
  }
  private static manuscriptID() {
    return `${ObjectTypes.Manuscript}:${uuid_v4()}`
  }
  private static createProjectModel(userID: string, title?: string) {
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
        objectType: ObjectTypes.Project,
        createdAt,
        updatedAt: createdAt,
      },
    }
  }
  private static createManuscriptModel(projectID: string, prototype?: string) {
    const createdAt = timestamp()
    const manuscriptID = this.manuscriptID()
    return {
      id: manuscriptID,
      data: {
        _id: manuscriptID,
        containerID: projectID,
        prototype,
        objectType: ObjectTypes.Manuscript,
        createdAt,
        updatedAt: createdAt,
      },
    }
  }
  public static buildModel(data: any) {
    if (data.data) {
      data.data._id = data.id || data._id
    }
    return data.data
  }
}
