/*!
 * © 2023 Atypon Systems LLC
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

import { celebrate } from 'celebrate'
import { Router } from 'express'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { BaseRoute } from '../../BaseRoute'
import { ProjectController } from './ProjectController'
import {
  createManuscriptHandler,
  createProjectHandler,
  deleteProjectHandler,
  generateAccessTokenHandler,
  getArchiveHandler,
  getCollaboratorsHandler,
  getProjectModelsHandler,
  updateProjectHandler,
  updateUserRoleHandler,
} from './ProjectRouteHandlers'
import {
  accessTokenSchema,
  addUserSchema,
  createManuscriptSchema,
  createProjectSchema,
  deleteSchema,
  getArchiveSchema,
  loadProjectSchema,
  projectCollaboratorsSchema,
  saveProjectSchema,
} from './ProjectSchema'

export class ProjectRoute extends BaseRoute {
  // @ts-ignore
  private projectController = new ProjectController()

  private get basePath(): string {
    return '/project'
  }
  public create(router: Router): void {
    router.post(
      `${this.basePath}/:projectID?`,
      celebrate(createProjectSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      createProjectHandler.bind(this)
    )
    router.put(
      `${this.basePath}/:projectID`,
      celebrate(saveProjectSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      updateProjectHandler.bind(this)
    )

    router.get(
      [`${this.basePath}/:projectID`, `${this.basePath}/:projectID/manuscript/:manuscriptID?`],
      celebrate(loadProjectSchema, {}),
      AuthStrategy.JWTAuth,
      getProjectModelsHandler.bind(this)
    )

    router.post(
      `${this.basePath}/:projectID/users`,
      celebrate(addUserSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      updateUserRoleHandler.bind(this)
    )

    router.post(
      `${this.basePath}/:projectID/manuscript/:manuscriptID?`,
      celebrate(createManuscriptSchema, {}),
      AuthStrategy.JWTAuth,
      createManuscriptHandler.bind(this)
    )

    router.get(
      `${this.basePath}/:projectID/collaborators`,
      celebrate(projectCollaboratorsSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      getCollaboratorsHandler.bind(this)
    )

    router.get(
      [
        `${this.basePath}/:projectID/archive`,
        `${this.basePath}/:projectID/manuscript/:manuscriptID/archive`,
      ],
      celebrate(getArchiveSchema, {}),
      AuthStrategy.JWTAuth,
      getArchiveHandler.bind(this)
    )

    router.get(
      `${this.basePath}/:projectID/:scope`,
      celebrate(accessTokenSchema, {}),
      AuthStrategy.JWTAuth,
      generateAccessTokenHandler.bind(this)
    )

    router.delete(
      `${this.basePath}/:projectID`,
      celebrate(deleteSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      deleteProjectHandler.bind(this)
    )
  }
}
