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

import { InvitationToken } from '../../../src/Models/UserModels'
import { ContainerRole } from '../../../src/Models/ContainerModels'
import {
  validInvitationToken,
  validInvitationToken2,
  validInvitationToken3,
  validInvitationToken4,
  validInvitationToken5,
  validInvitationTokenProjectNotInDB,
  invalidRoleInvitationToken,
  validTokenButInvitationExist,
  validTokenButInvitationExistBetterRole
} from '../fixtures/invitationTokens'

export const invitationTokenList: InvitationToken[] = []

invitationTokenList.push({
  _id: 'MPProject:valid-project-id+Viewer',
  containerID: 'MPProject:valid-project-id',
  permittedRole: ContainerRole.Viewer,
  token: validInvitationToken.token
})

invitationTokenList.push({
  _id: 'MPProject:valid-project-id-5+Viewer',
  containerID: 'MPProject:valid-project-id-5',
  permittedRole: ContainerRole.Viewer,
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9qZWN0SWQiOiJ2YWxpZC1wcm9qZWN0LWlkLTUiLCJyb2xlIjoiVmlld2VyIiwidmVyaWZpZXIiOiJmb29iYXJiYXoyIn0.Ct-6wlNJEBCSeYLwoM1K6T-4uosITBoQMVGu1MgZSS0'
})

invitationTokenList.push({
  _id: 'MPProject:valid-project-id-8+Writer',
  containerID: 'MPProject:valid-project-id-8',
  permittedRole: ContainerRole.Writer,
  token: validInvitationToken2.token
})

invitationTokenList.push({
  _id: 'MPProject:valid-project-id-8+Viewer',
  containerID: 'MPProject:valid-project-id-8',
  permittedRole: ContainerRole.Viewer,
  token: validInvitationToken3.token
})

invitationTokenList.push({
  _id: 'MPProject:valid-project-id-7+Viewer',
  containerID: 'MPProject:valid-project-id-7',
  permittedRole: ContainerRole.Viewer,
  token: validInvitationToken4.token
})

invitationTokenList.push({
  _id: 'MPProject:valid-project-id-2+Viewer',
  containerID: 'MPProject:valid-project-id-2',
  permittedRole: ContainerRole.Viewer,
  token: validTokenButInvitationExist.token
})

invitationTokenList.push({
  _id: 'MPProject:valid-project-id+Writer',
  containerID: 'MPProject:valid-project-id',
  permittedRole: ContainerRole.Writer,
  token: validTokenButInvitationExistBetterRole.token
})

invitationTokenList.push({
  _id: 'MPProject:valid-project-id-9+Writer',
  containerID: 'MPProject:valid-project-id-9',
  permittedRole: ContainerRole.Writer,
  token: validInvitationToken5.token
})

invitationTokenList.push({
  _id: 'MPProject:valid-project-id-3+Writer',
  containerID: 'MPProject:valid-project-id-3',
  permittedRole: ContainerRole.Writer,
  token: validInvitationTokenProjectNotInDB.token
})

invitationTokenList.push({
  _id: 'MPInvitationToken:valid-project-id+Owner',
  containerID: 'MPProject:valid-project-id',
  permittedRole: ContainerRole.Owner,
  token: invalidRoleInvitationToken.token
})
