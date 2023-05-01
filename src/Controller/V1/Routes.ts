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
import { BaseRoute } from '../BaseRoute'
import { AuthRoute } from './Auth/AuthRoute'
import { ContainerRoute } from './Container/ContainerRoute'
import { ContainerRequestRoute } from './ContainerRequest/ContainerRequestRoute'
import { InvitationRoute } from './Invitation/InvitationRoute'
import { ProjectRoute } from './Project/ProjectRoute'
import { RegistrationRoute } from './Registration/RegistrationRoute'
import { ServerStatusRoute } from './ServerStatus/ServerStatusRoute'
import { SGRoute } from './SG/SGRoute'
import { UserRoute } from './User/UserRoute'

export function getRoutes(): BaseRoute[] {
  return [
    new AuthRoute(),
    new RegistrationRoute(),
    new UserRoute(),
    new InvitationRoute(),
    new ServerStatusRoute(),
    new SGRoute(),
    new ContainerRoute(),
    new ProjectRoute(),
    new ContainerRequestRoute(),
  ];
}
