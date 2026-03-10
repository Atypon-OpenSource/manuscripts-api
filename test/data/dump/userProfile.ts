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

import { UserProfile } from '@manuscripts/transform'

import { UserService } from '../../../src/DomainServices/User/UserService'

export const userProfileList: UserProfile[] = []

userProfileList.push({
  _id: UserService.profileID('User|valid-user@manuscriptsapp.com'),
  userID: 'User_valid-user@manuscriptsapp.com',
  objectType: 'MPUserProfile',
  bibliographicName: {
    _id: 'MPBibliographicName:valid-bibliographic-name',
    objectType: 'MPBibliographicName',
    given: 'Kevin'
  },
})
