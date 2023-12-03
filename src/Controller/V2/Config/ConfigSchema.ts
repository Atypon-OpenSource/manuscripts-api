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

import Joi from 'joi'

import { appJsonAndCharset } from '../../BaseSchema'

export const configSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
  }).options({ allowUnknown: true }),
  query: Joi.object({
    id: Joi.string().required(),
  }),
}

export const defaultSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
  }).options({ allowUnknown: true }),
  query: Joi.object({
    id: Joi.string().required(),
  }),
}

export const templateSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
  }).options({ allowUnknown: true }),
  query: Joi.object({
    id: Joi.string()
      .regex(/^MPManuscriptTemplate:.+$/)
      .required(),
  }),
}

export const bundleSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
  }).options({ allowUnknown: true }),
  query: Joi.object({
    id: Joi.string()
      .regex(/^MPBundle:.+$/)
      .required(),
  }),
}
