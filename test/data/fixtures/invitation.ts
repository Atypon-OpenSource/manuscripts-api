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

import { ContainerInvitation } from '@manuscripts/json-schema'
import checksum from 'checksum'

export const validInvitation = {
  message: 'Message',
  invitedUsersEmails: [ 'valid-google@manuscriptsapp.com' ]
}

export const validInvitation2 = {
  message: 'Message',
  invitedUsersEmails: [ 'valid-google2@manuscriptsapp.com' ]
}

export const invalid = {
  message: 'Message',
  invitedUsersEmails: ['valid-user@manuscriptsapp.com']
}

export const validProjectInvitation = {
  message: 'Message',
  invitedUsers: [{ email: 'valid-google@manuscriptsapp.com', name: 'Valid Google' }],
  role: 'Viewer' as 'Viewer'
}

export const validProjectInvitation2 = {
  message: 'Message',
  invitedUsers: [ { email: 'valid-google2@manuscriptsapp.com', name: 'Valid Google' } ],
  role: 'Viewer' as 'Viewer'
}

export const validProjectInvitationWithoutEmail = {
  message: 'Message',
  invitedUsers: [ { email: 'valid-google2@manuscriptsapp.com', name: 'Valid Google' } ],
  role: 'Viewer' as 'Viewer',
  skipEmail: true
}

export const validProjectInvitationObject: ContainerInvitation = {
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user@manuscriptsapp.com-valid-user-4@manuscriptsapp.com-valid-project-id-2',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-user-4@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id-2',
  role: 'Viewer' as 'Viewer',
  message: 'Message',
  createdAt: 1522231220,
  updatedAt: 1522231220,
  invitingUserProfile: {
    createdAt: 1522231220,
    updatedAt: 1522231220,
    _id: 'MPUserProfile:valid-user-invite',
    objectType: 'MPUserProfile',
    bibliographicName: {
      _id: 'MPBibliographicName:valid-name',
      objectType: 'MPBibliographicName'
    },
    userID: `User_valid-user@manuscriptsapp.com`
  },
  objectType: 'MPContainerInvitation'
}
