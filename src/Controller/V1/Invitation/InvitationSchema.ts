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

import { jsonHeadersSchema, emailSchema, appJsonAndCharset } from '../../BaseSchema'

export const inviteSchema: Joi.SchemaMap = {
  body: Joi.object({
    invitedUsersEmails: Joi.array().items(emailSchema).unique().required(),
    message: Joi.string().max(500)
  }),
  headers: jsonHeadersSchema.headers
}

export const containerInviteSchema: Joi.SchemaMap = {
  body: Joi.object({
    invitedUsers: Joi.array().items(Joi.object({
      name: Joi.string().max(100),
      email: emailSchema.required()
    })).required(),
    role: Joi.string().required(),
    message: Joi.string().max(500),
    skipEmail: Joi.bool()
  }),
  headers: jsonHeadersSchema.headers
}

export const rejectSchema: Joi.SchemaMap = {
  body: Joi.object({
    invitationId: Joi.string().required()
  }),
  headers: jsonHeadersSchema.headers
}

export const acceptSchema: Joi.SchemaMap = {
  body: Joi.object({
    invitationId: Joi.string()
      .required(),
    password: Joi.string()
      .max(100)
      .min(8),
    name: Joi.string()
      .max(100)
  }),
  headers: jsonHeadersSchema.headers
}

export const uninviteSchema: Joi.SchemaMap = {
  body: Joi.object({
    invitationId: Joi.string().required()
  }),
  headers: jsonHeadersSchema.headers
}

export const requestInvitationTokenSchema: Joi.SchemaMap = {
  params: Joi.object({
    containerID: Joi.string().required(),
    role: Joi.string().required()
  })
}

export const refreshInvitationTokenSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset
  }).options({ allowUnknown: true })
}

export const accessSharedUriSchema: Joi.SchemaMap = {
  body: Joi.object({
    token: Joi.string().required()
  }),
  headers: jsonHeadersSchema.headers
}
