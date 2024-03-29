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
import { AuthRoute } from '../V1/Auth/AuthRoute'
import { RegistrationRoute } from '../V1/Registration/RegistrationRoute'
import { ServerStatusRoute } from '../V1/ServerStatus/ServerStatusRoute'
import { UserRoute } from '../V1/User/UserRoute'
import { ConfigRoute } from './Config/ConfigRoute'
import { DocumentRoute } from './Document/DocumentRoute'
import { ProjectRoute } from './Project/ProjectRoute'
import { SnapshotRoute } from './Snapshot/SnapshotRoute'

export function getRoutes(): BaseRoute[] {
  return [
    new AuthRoute(),
    new RegistrationRoute(),
    new UserRoute(),
    new ServerStatusRoute(),
    new ProjectRoute(),
    new ConfigRoute(),
    new DocumentRoute(),
    new SnapshotRoute(),
  ]
}
