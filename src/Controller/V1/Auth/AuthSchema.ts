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
  jsonHeadersSchema,
  appSecretHeadersSchema,
  emailSchema,
  deviceIdSchema,
  appIdHeadersSchema,
} from '../../BaseSchema'
import { APP_ID_HEADER_KEY } from './AuthController'

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

export const iamOAuthStartSchema: Joi.SchemaMap = {
  query: Joi.object({
    deviceId: deviceIdSchema,
    [APP_ID_HEADER_KEY]: Joi.string().max(100),
  }).options({ allowUnknown: true }),
  headers: Joi.object({
    [APP_ID_HEADER_KEY]: Joi.string().max(100),
  }).options({ allowUnknown: true }),
}

export const iamOAuthCallbackSchema: Joi.SchemaMap = {
  query: Joi.object({
    id_token: Joi.string(), // TODO: confirm if id_token should be required
    state: Joi.string().required(),
    error: Joi.string(),
    error_description: Joi.string(),
  }),
}

export const backchannelLogoutSchema: Joi.SchemaMap = {
  query: Joi.object({
    logout_token: Joi.string().required(),
  }),
}

export const forgotPasswordSchema: Joi.SchemaMap = {
  headers: jsonHeadersSchema.headers,
  body: Joi.object({
    email: emailSchema.required(),
  }),
}

export const resetPasswordSchema: Joi.SchemaMap = {
  headers: appIdHeadersSchema.headers,
  body: Joi.object({
    password: Joi.string().max(100).required(),
    token: Joi.string().required(),
    deviceId: deviceIdSchema,
  }),
}

export const changePasswordSchema: Joi.SchemaMap = {
  headers: jsonHeadersSchema.headers,
  body: Joi.object({
    deviceId: deviceIdSchema,
    currentPassword: Joi.string().max(100).required(),
    newPassword: Joi.string().max(100).required(),
  }),
}

export const authorizationTokenSchema: Joi.SchemaMap = {
  params: Joi.object({
    scope: Joi.string().required(),
  }),
}
