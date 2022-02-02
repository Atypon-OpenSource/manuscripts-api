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
import { APP_ID_HEADER_KEY, APP_SECRET_HEADER_KEY } from './V1/Auth/AuthController'

export const emailSchema: Joi.StringSchema = Joi.string().max(100).email({ minDomainAtoms: 2 })
export const appIdSchema: Joi.StringSchema = Joi.string().max(100).required()
export const deviceIdSchema: Joi.StringSchema = Joi.string().max(100).required()
export const appSecretSchema: Joi.StringSchema = Joi.string().required()
export const appJsonAndCharset: Joi.StringSchema = Joi.string().required()

export const jsonHeadersSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
    'content-type': appJsonAndCharset
  }).options({ allowUnknown: true })
}

export const appSecretHeadersSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
    'content-type': appJsonAndCharset,
    [APP_ID_HEADER_KEY]: appIdSchema,
    [APP_SECRET_HEADER_KEY]: appSecretSchema
  }).options({ allowUnknown: true })
}

export const appIdHeadersSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset,
    'content-type': appJsonAndCharset,
    [APP_ID_HEADER_KEY]: appIdSchema
  }).options({ allowUnknown: true })
}
