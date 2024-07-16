/*!
 * © 2023 Atypon Systems LLC
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
import { templates } from '../dump/templates'
import { CITATION_STYLE, LOCALE } from './JatsFixure'
import { validManuscript } from './manuscripts'
import { validProject } from './projects'
import { validUser } from './userServiceUser'

export const createProjectRequest = {
  user: validUser,
  body: {
    title: 'test',
  },
}

export const updateProjectRequest = {
  user: validUser,
  params: {
    projectID: validProject._id,
  },
  body: {
    data: [],
  },
}

export const getProjectModelsRequest = {
  user: validUser,
  params: {
    projectID: validProject._id,
  },
  body: {},
  headers: {
    'if-modified-since': new Date('2022-01-01').toISOString(),
  },
}

export const updateUserRoleRequest = {
  user: validUser,
  params: {
    projectID: validProject._id,
  },
  body: {
    userID: '',
    role: 'Writer',
  },
}

export const createManuscriptRequest = {
  user: validUser,
  params: {
    projectID: validProject._id,
  },
  body: {
    templateID: templates[0]._id,
  },
}

export const getUserProfilesRequest = {
  user: validUser,
  params: {
    projectID: validProject._id,
  },
}

export const getArchiveRequest = {
  user: validUser,
  params: {
    projectID: validProject._id,
    manuscriptID: validManuscript._id,
  },
  query: {
    onlyIDs: 'true',
  },
  headers: {
    accept: 'application/zip',
  },
}

export const deleteProjectRequest = {
  user: validUser,
  params: {
    projectID: validProject._id,
  },
}

export const exportJatsRequest = {
  user: validUser,
  params: {
    projectID: validProject._id,
    manuscriptID: validManuscript._id,
  },
  body: {
    citationStyle: CITATION_STYLE,
    locale: LOCALE,
  },
}

export function removeUser(request: any) {
  const { user, ...rest } = request
  return rest
}
