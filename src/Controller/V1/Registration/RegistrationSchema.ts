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

import { jsonHeadersSchema, emailSchema } from '../../BaseSchema'

export const signupSchema: Joi.SchemaMap = {
  body: Joi.object({
    email: emailSchema.required(),
    password: Joi.string()
      .max(100)
      .min(8)
      .required(),
    name: Joi.string()
      .max(100)
      .required()
  }),
  headers: jsonHeadersSchema.headers
}

export const verificationSchema: Joi.SchemaMap = {
  body: Joi.object({
    token: Joi.string()
      .required()
  })
}

export const requestVerificationEmailSchema: Joi.SchemaMap = {
  body: Joi.object({
    email: emailSchema.required()
  })
}
