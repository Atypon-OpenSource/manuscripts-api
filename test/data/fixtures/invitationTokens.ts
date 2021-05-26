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

const cryptoRandomString = require('crypto-random-string')

import { ContainerRole } from '../../../src/Models/ContainerModels'

export const invalidRoleInvitationToken = {
  _id: 'MPInvitationToken:valid-project-id+Owner',
  containerID: 'MPProject:valid-project-id',
  permittedRole: ContainerRole.Owner,
  token: cryptoRandomString(40)
}

export const validInvitationToken = {
  _id: 'MPInvitationToken:valid-project-id+Viewer',
  containerID: 'MPProject:valid-project-id',
  permittedRole: ContainerRole.Viewer,
  token: cryptoRandomString(40)
}

export const validInvitationToken2 = {
  _id: 'MPInvitationToken:valid-project-id-8+Writer',
  containerID: 'MPProject:valid-project-id-8',
  permittedRole: ContainerRole.Writer,
  token: cryptoRandomString(40)
}

export const validInvitationToken3 = {
  _id: 'MPInvitationToken:valid-project-id-8+Viewer',
  containerID: 'MPProject:valid-project-id-8',
  permittedRole: ContainerRole.Viewer,
  token: cryptoRandomString(40)
}

export const validInvitationToken4 = {
  _id: 'MPInvitationToken:valid-project-id-7+Viewer',
  containerID: 'MPProject:valid-project-id-7',
  permittedRole: ContainerRole.Viewer,
  token: cryptoRandomString(40)
}

export const validInvitationTokenProjectNotInDB = {
  id: 'valid-project-id-3+Writer',
  containerID: 'MPProject:valid-project-id-3',
  permittedRole: ContainerRole.Writer,
  token: cryptoRandomString(40)
}

export const validInvitationTokenNotInDB = {
  _id: 'MPInvitationToken:valid-project-id-6+Writer',
  containerID: 'MPProject:valid-project-id-6',
  permittedRole: ContainerRole.Writer,
  token: cryptoRandomString(40)
}

export const validTokenButInvitationExist = {
  _id: 'MPInvitationToken:valid-project-id-2+Viewer',
  containerID: 'MPProject:valid-project-id-2',
  permittedRole: ContainerRole.Viewer,
  token: cryptoRandomString(40)
}

export const validTokenButInvitationExistBetterRole = {
  _id: 'MPInvitationToken:valid-project-id+Writer',
  containerID: 'MPProject:valid-project-id',
  permittedRole: ContainerRole.Writer,
  token: cryptoRandomString(40)
}

export const validInvitationToken5 = {
  _id: 'MPInvitationToken:valid-project-id-9+Writer',
  containerID: 'MPProject:valid-project-id-9',
  permittedRole: ContainerRole.Writer,
  token: cryptoRandomString(40)
}
