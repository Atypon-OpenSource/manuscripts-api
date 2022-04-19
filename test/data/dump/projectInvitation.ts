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
import { UserProfile, ContainerInvitation } from '@manuscripts/manuscripts-json-schema'
import { ContainerRole } from '../../../src/Models/ContainerModels'

export const projectInvitationsList: ContainerInvitation[] = []

const invitingUserProfile: UserProfile = {
  createdAt: 1522231220,
  updatedAt: 1522231220,
  _id: 'MPUserProfile:valid-user-invite',
  objectType: 'MPUserProfile',
  bibliographicName: {
    _id: 'MPBibliographicName:valid-name',
    objectType: 'MPBibliographicName'
  },
  userID: `User_valid-user@manuscriptsapp.com`
}

const invitingUserProfile2: UserProfile = {
  createdAt: 1522231220,
  updatedAt: 1522231220,
  _id: 'MPUserProfile:valid-user2-invite',
  objectType: 'MPUserProfile',
  bibliographicName: {
    _id: 'MPBibliographicName:valid-name',
    objectType: 'MPBibliographicName'
  },
  userID: `User_valid-user-4@manuscriptsapp.com`
}

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-valid-project-id-2',
    { algorithm: 'sha1' }
  ),
  invitingUserProfile,
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-google@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id-2',
  role: ContainerRole.Viewer,
  message: 'Message',
  createdAt: 1522231220,
  updatedAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user@manuscriptsapp.com-valid-google2@manuscriptsapp.com-valid-project-id-2',
    { algorithm: 'sha1' }
  ),
  invitingUserProfile,
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-google@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id-2',
  role: ContainerRole.Viewer,
  message: 'Message',
  createdAt: 1522231220,
  updatedAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-MPProject:valid-project-id-2',
    { algorithm: 'sha1' }
  ),
  invitingUserProfile,
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-google@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id-2',
  role: ContainerRole.Viewer,
  message: 'Message',
  createdAt: 1522231220,
  updatedAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user@manuscriptsapp.com-valid-user-2@manuscriptsapp.com-valid-project-id-2',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-user-2@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id-2',
  role: ContainerRole.Viewer,
  message: 'Message',
  invitingUserProfile,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user@manuscriptsapp.com-valid-user-4@manuscriptsapp.com-valid-project-id-2',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-user-4@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id-2',
  role: ContainerRole.Viewer,
  message: 'Message',
  invitingUserProfile,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user@manuscriptsapp.com-valid-user-4@manuscriptsapp.com-not-valid-project-id',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-user-4@manuscriptsapp.com',
  containerID: 'MPProject:not-valid-project-id',
  role: ContainerRole.Viewer,
  message: 'Message',
  invitingUserProfile,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-valid-project-id',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-google@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id',
  role: ContainerRole.Viewer,
  message: 'Message',
  invitingUserProfile,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-google@manuscriptsapp.com-valid-user@manuscriptsapp.com-valid-project-id-2',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-google@manuscriptsapp.com',
  invitedUserEmail: 'valid-user@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id-2',
  role: ContainerRole.Writer,
  message: 'Message',
  invitingUserProfile,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user-4@manuscriptsapp.com-valid-user@manuscriptsapp.com-valid-project-id',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-user-4@manuscriptsapp.com',
  invitedUserEmail: 'valid-user@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id',
  role: ContainerRole.Viewer,
  message: 'Message',
  invitingUserProfile,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user-9@manuscriptsapp.com-valid-user@manuscriptsapp.com-valid-project-id-4',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-user-9@manuscriptsapp.com',
  invitedUserEmail: 'valid-user@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id-4',
  role: ContainerRole.Viewer,
  message: 'Message',
  invitingUserProfile,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-7',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-user-6@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id-7',
  role: ContainerRole.Owner,
  message: 'Message',
  invitingUserProfile,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user-4@manuscriptsapp.com-valid-user@manuscriptsapp.com-not-valid-project-id',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-user-4@manuscriptsapp.com',
  invitedUserEmail: 'valid-user@manuscriptsapp.com',
  containerID: 'MPProject:not-valid-project-id',
  role: ContainerRole.Viewer,
  message: 'Message',
  invitingUserProfile: invitingUserProfile2,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPContainerInvitation'
})

projectInvitationsList.push({
  _id: 'MPContainerInvitation:' + checksum(
    'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-6',
    { algorithm: 'sha1' }
  ),
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-user-6@manuscriptsapp.com',
  containerID: 'MPProject:valid-project-id-6',
  role: ContainerRole.Viewer,
  message: 'Message',
  invitingUserProfile,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPContainerInvitation'
})
