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


export const validUserProfile = {
  _id: 'MPUserProfile:valid-user-profile',
  userID: 'User_valid-user-1@manuscriptsapp.com',
  objectType: 'MPUserProfile',
  bibliographicName: {
    _id: 'MPBibliographicName:valid-bibliographic-name',
    objectType: 'MPBibliographicName',
    given: 'Kevin',
  },
}

export const validUserProfile2 = {
  _id: 'MPUserProfile:valid-user-profile-2',
  userID: 'User_valid-user-2@manuscriptsapp.com',
  objectType: 'MPUserProfile',
  bibliographicName: {
    _id: 'MPBibliographicName:valid-bibliographic-name',
    objectType: 'MPBibliographicName',
    given: 'Prince',
  },
}

export const validUser1 = {
  _id: 'User|valid-user-1@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-user-1@manuscriptsapp.com',
}

export const validUser2 = {
  _id: 'User|valid-user-2@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-user-2@manuscriptsapp.com',
}

export const validNewUser = {
  _id: 'User|new-user@manuscriptsapp.com',
  name: 'Valid New User',
  email: 'new-user@manuscriptsapp.com',
}

export const validNewUser2 = {
  _id: 'User|new-user-2@manuscriptsapp.com',
  name: 'Valid New User',
  email: 'new-user-2@manuscriptsapp.com',
}

export const NewUserNoId = {
  name: 'Valid New User',
  email: 'new-user@manuscriptsapp.com',
}

export const userList: any = []
userList.push({
  BUCKET_NAME: {
    _id: 'User|valid-user@manuscriptsapp.com',
    name: 'Valid System User',
    email: 'valid-user@manuscriptsapp.com',
  },
})
