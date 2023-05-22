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
import { validUser } from './userServiceUser'

export const validProjectRouteRequest = {
  data: {
    test: 'random',
  },
  body: {
    templateID: 'template_id',
    title: 'random',
    types: ['type1', 'type2'],
    role: 'Writer',
    userID: 'user_id',
  },
  params: {
    projectID: 'project_id',
    manuscriptID: 'manuscript_id',
    scope: 'random',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithInvalidRole = {
  data: {
    test: 'random',
  },
  body: {
    templateID: 'template_id',
    title: 'random',
    types: ['type1', 'type2'],
    role: 'writer',
    userID: 'user_id',
  },
  params: {
    projectID: 'project_id',
    manuscriptID: 'manuscript_id',
    scope: 'random',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutUser = {
  data: {
    test: 'random',
  },
  body: {
    templateID: 'template_id',
    title: 'random',
    types: ['type1', 'type2'],
    role: 'Writer',
    userID: 'user_id',
  },
  params: {
    projectID: 'project_id',
    manuscriptID: 'manuscript_id',
    scope: 'random',
  },
  user: null,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutProjectID = {
  data: {
    test: 'random',
  },
  body: {
    templateID: 'template_id',
    title: 'random',
    types: ['type1', 'type2'],
    role: 'Writer',
    userID: 'user_id',
  },
  params: {
    manuscriptID: 'manuscript_id',
    scope: 'random',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutScope = {
  data: {
    test: 'random',
  },
  body: {
    templateID: 'template_id',
    title: 'random',
    types: ['type1', 'type2'],
    role: 'Writer',
    userID: 'user_id',
  },
  params: {
    projectID: 'project_id',
    manuscriptID: 'manuscript_id',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutManuscriptID = {
  data: {
    test: 'random',
  },
  body: {
    templateID: 'template_id',
    title: 'random',
    types: ['type1', 'type2'],
    role: 'Writer',
    userID: 'user_id',
  },
  params: {
    projectID: 'project_id',
    scope: 'random',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutRole = {
  data: {
    test: 'random',
  },
  body: {
    templateID: 'template_id',
    title: 'random',
    types: ['type1', 'type2'],
    userID: 'user_id',
  },
  params: {
    projectID: 'project_id',
    manuscriptID: 'manuscript_id',
    scope: 'random',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutUserID = {
  data: {
    test: 'random',
  },
  body: {
    templateID: 'template_id',
    title: 'random',
    types: ['type1', 'type2'],
    role: 'Writer',
  },
  params: {
    projectID: 'project_id',
    manuscriptID: 'manuscript_id',
    scope: 'random',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
