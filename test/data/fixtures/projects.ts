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

import { ProjectLike } from 'src/DataAccess/Interfaces/Models'

export const validProject: ProjectLike = {
  _id: 'valid-project-id',
  objectType: 'MPProject',
  owners: ['User_test'],
  writers: [],
  viewers: []
}

export const validProjectRequest: ProjectLike = {
  _id: 'valid-project-id-request',
  objectType: 'MPProject',
  owners: ['User_valid-user@manuscriptsapp.com'],
  writers: [],
  viewers: ['User_valid-user-3@manuscriptsapp.com']
}

export const validProjectForMemento: ProjectLike = {
  _id: 'valid-project-id-memento',
  objectType: 'MPProject',
  owners: [],
  writers: [],
  viewers: []
}

export const validProjectForSummary: ProjectLike = {
  _id: 'valid-project-id-summary',
  objectType: 'MPProject',
  owners: [],
  writers: [],
  viewers: []
}

export const validProject6: ProjectLike = {
  _id: 'valid-project-id-6',
  objectType: 'MPProject',
  owners: ['User_test'],
  writers: [],
  viewers: []
}

export const validProject2: ProjectLike = {
  _id: 'valid-project-id-2',
  objectType: 'MPProject',
  owners: ['User_test', 'User_valid-user-1@manuscriptsapp.com'],
  writers: [],
  viewers: []
}

export const validProject3: ProjectLike = {
  _id: 'valid-project-id-3',
  objectType: 'MPProject',
  owners: ['User_foo@bar.com'],
  writers: [],
  viewers: []
}

export const validProject4: ProjectLike = {
  _id: 'valid-project-id-4',
  objectType: 'MPProject',
  owners: ['User_valid-user-1@manuscriptsapp.com'],
  writers: ['User_test', 'User_test10'],
  viewers: ['User_test2']
}

export const validProject5: ProjectLike = {
  _id: 'valid-project-id-5',
  objectType: 'MPProject',
  owners: ['User_valid-user-1@manuscriptsapp.com'],
  writers: [],
  viewers: ['User_valid-user@manuscriptsapp.com']
}

export const validProject8: ProjectLike = {
  _id: 'valid-project-id-8',
  objectType: 'MPProject',
  owners: ['User_valid-user-1@manuscriptsapp.com'],
  writers: [],
  viewers: [],
  editors: ['User_foo@bar.com'],
  annotators: ['User_test2']
}

export const validProjectNotInDB: ProjectLike = {
  _id: 'valid-project-not-in-db',
  objectType: 'MPProject',
  owners: ['User_test'],
  writers: [],
  viewers: []
}

export const validProjectForRemoveTest: ProjectLike = {
  _id: 'valid-project-for-remove-test',
  objectType: 'MPProject',
  owners: ['User_test'],
  writers: [],
  viewers: []
}

export const invalidTypeProject = {
  objectType: 'MPAnything',
  _id: 'valid-id-2'
}

export const validProject7: ProjectLike = {
  _id: 'valid-project-id-7',
  objectType: 'MPProject',
  owners: ['User_valid-user-1@manuscriptsapp.com'],
  writers: ['User_test', 'User_test10'],
  viewers: ['User_test2', '*']
}
