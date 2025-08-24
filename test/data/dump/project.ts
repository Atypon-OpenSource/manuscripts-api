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

import { ProjectLike } from '../../../src/DataAccess/Interfaces/Models'

export const projectsList: ProjectLike[] = []

projectsList.push({
  _id: 'MPProject:valid-project-id',
  objectType: 'MPProject',
  owners: ['User_valid-user-2@manuscriptsapp.com', 'User_test'],
  writers: [],
  viewers: []
})

projectsList.push({
  _id: 'MPProject:valid-project-id-2',
  objectType: 'MPProject',
  owners: [
    'User_test',
    'User_valid-user@manuscriptsapp.com',
    'User_valid-user-3@manuscriptsapp.com'
  ],
  writers: ['User_valid-user-2@manuscriptsapp.com'],
  viewers: []
})

projectsList.push({
  _id: 'MPProject:valid-project-id-4',
  objectType: 'MPProject',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: ['User_test', 'User_valid-user-3@manuscriptsapp.com'],
  viewers: ['User_test2', 'User_valid-user-2@manuscriptsapp.com']
})

projectsList.push({
  _id: 'MPProject:valid-project-id-5',
  objectType: 'MPProject',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: [],
  viewers: []
})

projectsList.push({
  _id: 'MPProject:valid-project-id-6',
  objectType: 'MPProject',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: [],
  viewers: []
})

projectsList.push({
  _id: 'MPProject:valid-project-id-7',
  objectType: 'MPProject',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: ['User_valid-user-2@manuscriptsapp.com'],
  viewers: ['User_valid-user-6@manuscriptsapp.com']
})

projectsList.push({
  _id: 'MPProject:valid-project-id-8',
  objectType: 'MPProject',
  owners: ['User_valid-user-2@manuscriptsapp.com'],
  writers: [],
  viewers: ['User_valid-user@manuscriptsapp.com']
})

projectsList.push({
  _id: 'MPProject:valid-project-id-9',
  objectType: 'MPProject',
  owners: ['User_valid-user-2@manuscriptsapp.com'],
  writers: [],
  viewers: ['User_valid-user-3@manuscriptsapp.com']
})

projectsList.push({
  _id: 'MPProject:valid-project-id-10',
  objectType: 'MPProject',
  owners: ['User_valid-user-2@manuscriptsapp.com'],
  writers: ['User_valid-user@manuscriptsapp.com'],
  viewers: []
})

projectsList.push({
  _id: 'MPProject:valid-project-id-request',
  objectType: 'MPProject',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: [],
  viewers: ['User_valid-user-3@manuscriptsapp.com']
})

projectsList.push({
  _id: 'MPProject:valid-project-id-request-2',
  objectType: 'MPProject',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: [],
  viewers: []
})

projectsList.push({
  _id: 'MPProject:valid-project-id-request-3',
  objectType: 'MPProject',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: ['User_valid-user-3@manuscriptsapp.com'],
  viewers: []
})

projectsList.push({
  _id: 'MPProject:valid-project-id-request-4',
  objectType: 'MPProject',
  owners: ['User_valid-user-3@manuscriptsapp.com'],
  writers: ['User_valid-user@manuscriptsapp.com'],
  viewers: []
})

projectsList.push({
  _id: 'MPProject:valid-project-id-11',
  objectType: 'MPProject',
  owners: ['User_valid-user-6@manuscriptsapp.com'],
  writers: [],
  viewers: []
})

projectsList.push({
  _id: 'MPProject:valid-project-id-12',
  objectType: 'MPProject',
  owners: ['User_valid-user@manuscriptsapp.com', 'User_test'],
  writers: [],
  viewers: [],
  annotators: ['User_valid-user-2@manuscriptsapp.com'],
})
