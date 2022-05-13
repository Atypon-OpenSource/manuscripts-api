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

import { jsonHeadersSchema } from '../../BaseSchema'

export const sgGetSchema: Joi.SchemaMap = {
  headers: jsonHeadersSchema.headers,
  params: Joi.object({
    id: Joi.string().required(),
    db: Joi.string().required(),
  }),
}

export const sgPostSchema: Joi.SchemaMap = {
  headers: jsonHeadersSchema.headers,
}

export const sgPutSchema: Joi.SchemaMap = {
  headers: jsonHeadersSchema.headers,
  params: Joi.object({
    id: Joi.string().required(),
    db: Joi.string().required(),
  }),
  query: Joi.object({
    rev: Joi.string().required(),
  }),
}

export const sgDeleteSchema: Joi.SchemaMap = {
  headers: jsonHeadersSchema.headers,
  params: Joi.object({
    id: Joi.string().required(),
    db: Joi.string().required(),
  }),
  query: Joi.object({
    rev: Joi.string().required(),
  }),
}
