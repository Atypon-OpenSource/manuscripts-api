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

import { Invitation, UserProfile } from '@manuscripts/json-schema'
import checksum from 'checksum'

export const invitationsList: Invitation[] = []

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

invitationsList.push({
  _id: 'MPInvitation:' + checksum('valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com', { algorithm: 'sha1' }),
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-google@manuscriptsapp.com',
  invitingUserProfile,
  message: 'Message',
  createdAt: 1522231220,
  updatedAt: 1522231220,
  objectType: 'MPInvitation'
})

invitationsList.push({
  _id: 'MPInvitation:' + checksum('valid-user@manuscriptsapp.com-valid-google3@manuscriptsapp.com', { algorithm: 'sha1' }),
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-google3@manuscriptsapp.com',
  invitingUserProfile,
  message: 'Message',
  createdAt: 1522231220,
  updatedAt: 1522231220,
  objectType: 'MPInvitation'
})

invitationsList.push({
  _id: 'MPInvitation:' + checksum('valid-user@manuscriptsapp.com-valid-user-4@manuscriptsapp.com', { algorithm: 'sha1' }),
  invitingUserID: 'User_valid-user@manuscriptsapp.com',
  invitedUserEmail: 'valid-user-4@manuscriptsapp.com',
  message: 'Message',
  invitingUserProfile,
  updatedAt: 1522231220,
  createdAt: 1522231220,
  objectType: 'MPInvitation'
})
