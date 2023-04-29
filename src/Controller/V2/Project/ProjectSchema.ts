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
import * as Joi from 'joi'

import { appJsonAndCharset, jsonHeadersSchema } from '../../BaseSchema'

const allowUnknownObjectsSchema = Joi.defaults((schema) =>
  schema.options({
    allowUnknown: true,
  })
)
export const createProjectSchema: Joi.SchemaMap = {
  headers: jsonHeadersSchema.headers,
  body: Joi.object({
    title: Joi.string(),
    owners: Joi.array().items(Joi.string()),
    writers: Joi.array().items(Joi.string()),
    viewers: Joi.array().items(Joi.string()),
  }),
}

export const saveProjectSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
    'content-type': Joi.string().required(),
  }).options({ allowUnknown: true }),
  params: Joi.object({
    projectID: Joi.string().required(),
  }),
  body: Joi.object({
    data: Joi.array().items(
      allowUnknownObjectsSchema.object({
        _id: Joi.string().required(),
        objectType: Joi.string().required(),
      })
    ),
  }),
}

export const projectCollaboratorsSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
  }).options({ allowUnknown: true }),
  params: Joi.object({
    projectID: Joi.string().required(),
  }),
}

export const deleteSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
  }).options({ allowUnknown: true }),
  params: Joi.object({
    projectID: Joi.string().required(),
  }),
}

export const manageUserRoleSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
  }).options({ allowUnknown: true }),
  body: Joi.object({
    userID: Joi.string().required(),
    role: Joi.string().allow(null),
  }),
  params: Joi.object({
    projectID: Joi.string().required(),
  }),
}

export const addUserSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
  }).options({ allowUnknown: true }),
  body: Joi.object({
    userID: Joi.string().required(),
    role: Joi.string().required(),
  }),
  params: Joi.object({
    projectID: Joi.string().required(),
  }),
}

export const getArchiveSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
  }).options({ allowUnknown: true }),
  params: Joi.object({
    projectID: Joi.string().required(),
    manuscriptID: Joi.string(),
  }),
}

export const loadProjectSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
    'if-modified-since': Joi.date(),
  }).options({ allowUnknown: true }),
  params: Joi.object({
    projectID: Joi.string().required(),
    manuscriptID: Joi.string(),
  }),
  body: Joi.object({
    types: Joi.array().items(Joi.string()),
  }),
}

export const accessTokenSchema: Joi.SchemaMap = {
  params: Joi.object({
    projectID: Joi.string().required(),
    scope: Joi.string().required(),
  }),
}

export const createManuscriptSchema: Joi.SchemaMap = {
  params: Joi.object({
    projectID: Joi.string().required(),
    manuscriptID: Joi.string(),
  }),
  body: Joi.object({
    templateID: Joi.string(),
  }),
}
