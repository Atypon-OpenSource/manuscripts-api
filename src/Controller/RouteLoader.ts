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

import { Router } from 'express'

import { BaseRoute } from './BaseRoute'
import { AuthRoute } from './V1/Auth/AuthRoute'
import { RegistrationRoute } from './V1/Registration/RegistrationRoute'
import { UserRoute } from './V1/User/UserRoute'
import { InvitationRoute } from './V1/Invitation/InvitationRoute'
import { ServerStatusRoute } from './V1/ServerStatus/ServerStatusRoute'
import { ContainerRoute } from './V1/Container/ContainerRoute'
import { ProjectRoute } from './V1/Project/ProjectRoute'
import { ContainerRequestRoute } from './V1/ContainerRequest/ContainerRequestRoute'
import { SubmissionRoute } from './V1/Submission/SubmissionRoute'
import { TemplatesRoute } from './V1/Templates/TemplatesRoute'

/**
 * Creates routes.
 * router Express router.
 */
export function loadRoutes (router: Router) {
  // push all routes
  const routes: BaseRoute[] = [
    new AuthRoute(),
    new RegistrationRoute(),
    new UserRoute(),
    new InvitationRoute(),
    new ServerStatusRoute(),
    new ContainerRoute(),
    new ProjectRoute(),
    new ContainerRequestRoute(),
    new SubmissionRoute(),
    new TemplatesRoute()
  ]

  for (const route of routes) {
    route.create(router)
  }
}
