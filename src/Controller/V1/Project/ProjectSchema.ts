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

import * as Joi from 'joi'

import { appJsonAndCharset, jsonHeadersSchema } from '../../BaseSchema'

export const createSchema: Joi.SchemaMap = {
  headers: jsonHeadersSchema.headers,
  body: Joi.object({
    title: Joi.string(),
    owners: Joi.array().items(Joi.string()),
    writers: Joi.array().items(Joi.string()),
    viewers: Joi.array().items(Joi.string()),
  }),
}

export const addSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
    'content-type': Joi.string().required(),
  }).options({ allowUnknown: true }),
  body: Joi.object({
    manuscriptId: Joi.string(),
    templateId: Joi.string(),
  }),
}

export const saveProjectSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
    'content-type': Joi.string().required(),
  }).options({ allowUnknown: true }),
  params: Joi.object({
    projectId: Joi.string().required(),
  }),
  body: Joi.object({
    manuscriptId: Joi.string().optional(),
  }),
}
