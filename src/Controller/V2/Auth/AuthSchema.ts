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

import {
  appIdHeadersSchema,
  appSecretHeadersSchema,
  deviceIdSchema,
  emailSchema,
} from '../../BaseSchema'

export const credentialsSchema: Joi.SchemaMap = {
  body: Joi.object({
    deviceId: deviceIdSchema,
    email: emailSchema.required(),
    password: Joi.string().max(100).required(),
  }),
  headers: appIdHeadersSchema.headers,
}

export const serverToServerAuthSchema: Joi.SchemaMap = {
  body: Joi.object({
    deviceId: deviceIdSchema,
  }),
  headers: appSecretHeadersSchema.headers,
}

export const serverToServerTokenAuthSchema: Joi.SchemaMap = {
  body: Joi.object({
    deviceId: deviceIdSchema,
  }),
  params: {
    connectUserID: Joi.string().required(),
  },
  headers: appSecretHeadersSchema.headers,
}

export const authorizationTokenSchema: Joi.SchemaMap = {
  params: Joi.object({
    scope: Joi.string().required(),
  }),
}
