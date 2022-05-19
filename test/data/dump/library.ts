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

import { LibraryLike } from '../../../src/DataAccess/Interfaces/Models'

export const librariesList: LibraryLike[] = []

librariesList.push({
  _id: 'MPLibrary:valid-library-id',
  objectType: 'MPLibrary',
  owners: ['User_valid-user-2@manuscriptsapp.com', 'User_test'],
  writers: [],
  viewers: []
})

librariesList.push({
  _id: 'valid-library-id-2',
  objectType: 'MPLibrary',
  owners: [
    'User_test',
    'User_valid-user@manuscriptsapp.com',
    'User_valid-user-3@manuscriptsapp.com'
  ],
  writers: ['User_valid-user-2@manuscriptsapp.com'],
  viewers: []
})

librariesList.push({
  _id: 'valid-library-id-4',
  objectType: 'MPLibrary',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: ['User_test', 'User_valid-user-3@manuscriptsapp.com'],
  viewers: ['User_test2', 'User_valid-user-2@manuscriptsapp.com']
})

librariesList.push({
  _id: 'valid-library-id-5',
  objectType: 'MPLibrary',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: [],
  viewers: []
})

librariesList.push({
  _id: 'valid-library-id-6',
  objectType: 'MPLibrary',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: [],
  viewers: []
})

librariesList.push({
  _id: 'valid-library-id-7',
  objectType: 'MPLibrary',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: ['User_valid-user-2@manuscriptsapp.com'],
  viewers: ['User_valid-user-6@manuscriptsapp.com']
})

librariesList.push({
  _id: 'valid-library-id-8',
  objectType: 'MPLibrary',
  owners: ['User_valid-user-2@manuscriptsapp.com'],
  writers: [],
  viewers: ['User_valid-user@manuscriptsapp.com']
})

librariesList.push({
  _id: 'valid-library-id-9',
  objectType: 'MPLibrary',
  owners: ['User_valid-user-2@manuscriptsapp.com'],
  writers: [],
  viewers: ['User_valid-user-3@manuscriptsapp.com']
})

librariesList.push({
  _id: 'valid-library-id-10',
  objectType: 'MPLibrary',
  owners: ['User_valid-user-2@manuscriptsapp.com'],
  writers: ['User_valid-user@manuscriptsapp.com'],
  viewers: []
})

librariesList.push({
  _id: 'valid-library-id-request',
  objectType: 'MPLibrary',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: [],
  viewers: ['User_valid-user-3@manuscriptsapp.com']
})

librariesList.push({
  _id: 'valid-library-id-request-2',
  objectType: 'MPLibrary',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: [],
  viewers: []
})

librariesList.push({
  _id: 'valid-library-id-request-3',
  objectType: 'MPLibrary',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: ['User_valid-user-3@manuscriptsapp.com'],
  viewers: []
})

librariesList.push({
  _id: 'valid-library-id-request-4',
  objectType: 'MPLibrary',
  owners: ['User_valid-user-3@manuscriptsapp.com'],
  writers: ['User_valid-user@manuscriptsapp.com'],
  viewers: []
})

librariesList.push({
  _id: 'valid-library-id-11',
  objectType: 'MPLibrary',
  owners: ['User_valid-user-6@manuscriptsapp.com'],
  writers: [],
  viewers: []
})