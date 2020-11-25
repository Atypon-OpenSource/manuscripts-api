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

import { GoogleAccessCredentials } from '../../../src/Models/UserModels'
import checksum from 'checksum'

export const validGoogleAccess: GoogleAccessCredentials = {
  email: 'valid-google-user@manuscriptsapp.com',
  name: 'Example User',
  deviceId: 'Device ID Example',
  appId: 'Application ID Example',
  invitationId: null,
  accessToken: 'foo',
  refreshToken: 'bar'
}

export const validGoogleAccessWithInvitationId: GoogleAccessCredentials = {
  email: 'valid-google-user@manuscriptsapp.com',
  name: 'Example User',
  deviceId: 'Device ID Example',
  appId: 'Application ID Example',
  invitationId: `MPInvitation:${checksum('valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com', { algorithm: 'sha1' })}`,
  accessToken: 'foo',
  refreshToken: 'bar'
}
