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
import { ObjectTypes } from '@manuscripts/json-schema'

import { ContainerRole } from '../../../src/Models/ContainerModels'
import { templates } from '../dump/templates'
import { validManuscript } from './manuscripts'
import { validProject } from './projects'
import { validUser } from './userServiceUser'

export const validProjectRouteRequest = {
  data: [
    {
      _id: validProject._id,
      objectType: ObjectTypes.Project,
      createdAt: 20,
      updatedAt: 21,
    },
  ],
  body: {
    templateID: templates[0]._id,
    title: 'pressroom',
    types: [ObjectTypes.ManuscriptNote, ObjectTypes.BibliographicName],
    role: ContainerRole.Writer,
    userID: validUser._id,
  },
  params: {
    projectID: validProject._id,
    manuscriptID: validManuscript._id,
    scope: 'pressroom',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithInvalidRole = {
  data: [
    {
      _id: validProject._id,
      objectType: ObjectTypes.Project,
      createdAt: 20,
      updatedAt: 21,
    },
  ],
  body: {
    templateID: templates[0]._id,
    title: 'pressroom',
    types: [ObjectTypes.ManuscriptNote, ObjectTypes.BibliographicName],
    role: 'random',
    userID: validUser._id,
  },
  params: {
    projectID: validProject._id,
    manuscriptID: validManuscript._id,
    scope: 'pressroom',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutUser = {
  data: [
    {
      _id: validProject._id,
      objectType: ObjectTypes.Project,
      createdAt: 20,
      updatedAt: 21,
    },
  ],
  body: {
    templateID: templates[0]._id,
    title: 'pressroom',
    types: [ObjectTypes.ManuscriptNote, ObjectTypes.BibliographicName],
    role: ContainerRole.Writer,
    userID: validUser._id,
  },
  params: {
    projectID: validProject._id,
    manuscriptID: validManuscript._id,
    scope: 'pressroom',
  },
  user: null,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutProjectID = {
  data: [
    {
      _id: validProject._id,
      objectType: ObjectTypes.Project,
      createdAt: 20,
      updatedAt: 21,
    },
  ],
  body: {
    templateID: templates[0]._id,
    title: 'pressroom',
    types: [ObjectTypes.ManuscriptNote, ObjectTypes.BibliographicName],
    role: ContainerRole.Writer,
    userID: validUser._id,
  },
  params: {
    manuscriptID: validManuscript._id,
    scope: 'pressroom',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutScope = {
  data: [
    {
      _id: validProject._id,
      objectType: ObjectTypes.Project,
      createdAt: 20,
      updatedAt: 21,
    },
  ],
  body: {
    templateID: templates[0]._id,
    title: 'pressroom',
    types: [ObjectTypes.ManuscriptNote, ObjectTypes.BibliographicName],
    role: ContainerRole.Writer,
    userID: validUser._id,
  },
  params: {
    projectID: validProject._id,
    manuscriptID: validManuscript._id,
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutManuscriptID = {
  data: [
    {
      _id: validProject._id,
      objectType: ObjectTypes.Project,
      createdAt: 20,
      updatedAt: 21,
    },
  ],
  body: {
    templateID: templates[0]._id,
    title: 'pressroom',
    types: [ObjectTypes.ManuscriptNote, ObjectTypes.BibliographicName],
    role: ContainerRole.Writer,
    userID: validUser._id,
  },
  params: {
    projectID: validProject._id,
    scope: 'pressroom',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutRole = {
  data: [
    {
      _id: validProject._id,
      objectType: ObjectTypes.Project,
      createdAt: 20,
      updatedAt: 21,
    },
  ],
  body: {
    templateID: templates[0]._id,
    title: 'pressroom',
    types: [ObjectTypes.ManuscriptNote, ObjectTypes.BibliographicName],
    userID: validUser._id,
  },
  params: {
    projectID: validProject._id,
    manuscriptID: validManuscript._id,
    scope: 'pressroom',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
export const projectRouteRequestWithoutUserID = {
  data: [
    {
      _id: validProject._id,
      objectType: ObjectTypes.Project,
      createdAt: 20,
      updatedAt: 21,
    },
  ],
  body: {
    templateID: templates[0]._id,
    title: 'pressroom',
    types: [ObjectTypes.ManuscriptNote, ObjectTypes.BibliographicName],
    role: ContainerRole.Writer,
  },
  params: {
    projectID: validProject._id,
    manuscriptID: validManuscript._id,
    scope: 'pressroom',
  },
  user: validUser,
  headers: { 'if-modified-since': new Date('2022-01-01').toISOString() },
  query: {
    onlyIDs: 'true',
  },
}
