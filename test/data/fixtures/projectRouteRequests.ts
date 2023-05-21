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

export const validCreateProjectReq = {
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
export const requestWithInvalidRole = {
  data: {
    test: 'random',
  },
  body: {
    templateID: 'template_id',
    title: 'test_title',
    types: ['type1', 'type2'],
    role: 'writer',
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
export const createProjectReqWithoutUser = {
  body: { templateID: 'template_id', title: 'random', role: 'Writer', userID: 'user_id' },
  params: {
    projectID: 'project_id',
    manuscriptID: 'manuscript_id',
  },
  user: null,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const createProjectReqWithoutProjectID = {
  body: { templateID: 'template_id', title: 'random', role: 'Writer', userID: 'user_id' },
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
export const createProjectReqWithoutScope = {
  body: { templateID: 'template_id', title: 'random', role: 'Writer', userID: 'user_id' },
  params: {
    manuscriptID: 'manuscript_id',
    projectID: 'project_id',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const createProjectReqWithoutManuscriptID = {
  body: { templateID: 'template_id', title: 'random', role: 'Writer', userID: 'user_id' },
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
export const requestWithoutRole = {
  body: { templateID: 'template_id', title: 'random', userID: 'user_id' },
  params: {
    projectID: 'project_id',
    manuscriptID: 'manuscript_id',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
}
export const requestWithoutUserID = {
  body: { templateID: 'template_id', title: 'random', role: 'Writer' },
  params: {
    projectID: 'project_id',
    manuscriptID: 'manuscript_id',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
}
