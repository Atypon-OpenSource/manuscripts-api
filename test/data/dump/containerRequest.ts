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

import checksum from 'checksum'

import { ContainerRequestLike } from '../../../src/DataAccess/Interfaces/Models'
import { ContainerRole } from '../../../src/Models/ContainerModels'

export const containerRequestList: ContainerRequestLike[] = []

containerRequestList.push({
  _id: `MPContainerRequest:${checksum(
    'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-request-2'
  )}`,
  objectType: 'MPContainerRequest',
  containerID: 'MPProject:valid-project-id-request-2',
  role: ContainerRole.Writer,
  userID: 'User_valid-user-3@manuscriptsapp.com'
})

containerRequestList.push({
  _id: `MPContainerRequest:${checksum(
    'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-request-3'
  )}`,
  objectType: 'MPContainerRequest',
  containerID: 'MPProject:valid-project-id-request-3',
  role: ContainerRole.Writer,
  userID: 'User_valid-user-3@manuscriptsapp.com'
})

containerRequestList.push({
  _id: `MPContainerRequest:${checksum(
    'User_valid-user@manuscriptsapp.com-MPProject:valid-project-id-request-4'
  )}`,
  objectType: 'MPContainerRequest',
  containerID: 'MPProject:valid-project-id-request-4',
  role: ContainerRole.Writer,
  userID: 'User_valid-user@manuscriptsapp.com'
})

containerRequestList.push({
  _id: `MPContainerRequest:${checksum(
    'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-request'
  )}`,
  objectType: 'MPContainerRequest',
  containerID: 'MPProject:valid-project-id-request',
  role: ContainerRole.Writer,
  userID: 'User_valid-user-3@manuscriptsapp.com'
})

containerRequestList.push({
  _id: `MPContainerRequest:${checksum(
    'User_valid-user-MPProject:valid-project-id-2'
  )}`,
  objectType: 'MPContainerRequest',
  containerID: 'MPProject:valid-project-id-2',
  role: ContainerRole.Writer,
  userID: 'User_valid-user'
})

containerRequestList.push({
  _id: `MPContainerRequest:${checksum(
    'User_valid-user-3@manuscriptsapp.com-MPProject:valid-project-id-8'
  )}`,
  objectType: 'MPContainerRequest',
  containerID: 'MPProject:valid-project-id-8',
  role: ContainerRole.Writer,
  userID: 'User_valid-user-3@manuscriptsapp.com'
})
