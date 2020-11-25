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

import { User } from '../../../src/Models/UserModels'

export const validUser: User = {
  _id: 'User|9f338224-b0d5-45aa-b02c-21c7e0c3c07b',
  name: 'System User',
  email: 'valid-user-new@manuscriptsapp.com'
}

export const userList: User[] = []

userList.push({
  _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
  name: 'Valid System User',
  email: 'valid-user@manuscriptsapp.com'
})

userList.push({
  _id: '9f338224-b0d5-45aa-b02c-21c7e0c3c07b',
  name: 'System User',
  email: 'valid-user-new@manuscriptsapp.com'
})
