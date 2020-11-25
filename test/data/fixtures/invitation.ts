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
import { ContainerInvitation } from '@manuscripts/manuscripts-json-schema'

export const validInvitation = {
  message: 'Message',
  invitedUsersEmails: [ 'valid-google@manuscriptsapp.com' ]
}

export const validInvitation2 = {
  message: 'Message',
  invitedUsersEmails: [ 'valid-google2@manuscriptsapp.com' ]
}

export const emptyInvitedUsersEmails = {
  message: 'Message',
  invitedUsersEmails: [ ]
}

export const invalid = {
  message: 'Message',
  invitedUsersEmails: ['valid-user@manuscriptsapp.com']
}

export const notExistUsers = {
  message: 'Message',
  invitedUsersEmails: ['invalid-user@manuscriptsapp.com']
}

export const nonStringMessageCredentials: any = {
  message: 123,
  invitedUsersEmails: [ 'valid-google@manuscriptsapp.com' ]
}

export const validJWTToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk'

export const invalidJWTToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsImlhdCI6MTUyMTk4Mjk2Mn0.VlDI1RNozfrJ2Z9V1R5Luu46lkVAIzhwX2ySkihlDS8'

export const invalidProjectInvitation = {
  message: 'Message',
  invitedUsers: [{ email: 'valid-user@manuscriptsapp.com', name: 'Valid User' }],
  role: 'Viewer' as 'Viewer'
}

export const validProjectInvitation = {
  message: 'Message',
  invitedUsers: [{ email: 'valid-google@manuscriptsapp.com', name: 'Valid Google' }],
  role: 'Viewer' as 'Viewer'
}

export const invitedUserAlreadyExist = {
  message: 'Message',
  invitedUsers: [{ email: 'valid-user-2@manuscriptsapp.com', name: 'Valid User' }],
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

export const emptyInvitedUsers = {
  message: 'Message',
  invitedUsers: [ ],
  role: 'Viewer' as 'Viewer'
}

export const invalidRole = {
  message: 'Message',
  invitedUsers: [{ email: 'valid-google@manuscriptsapp.com', name: 'Valid Google' }],
  role: 'invalid-role'
}

export const notExistProject = {
  message: 'Message',
  invitedUsers: [{ email: 'valid-google@manuscriptsapp.com', name: 'Valid Google' }],
  role: 'Viewer' as 'Viewer'
}

export const invalidProjectInvitation2 = {
  message: 'Message',
  invitedUsers: [{ email: 'valid-google@manuscriptsapp.com', name: 'Valid Google' }],
  role: 'Viewer' as 'Viewer'
}

export const validProjectInvitationObject: ContainerInvitation = {
  _id: checksum(
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
