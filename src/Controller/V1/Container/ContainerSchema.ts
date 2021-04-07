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

import { appJsonAndCharset } from '../../BaseSchema'

export const createSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset
  }).options({ allowUnknown: true }),
  body: Joi.object({
    _id: Joi.string()
  })
}

export const deleteSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset
  }).options({ allowUnknown: true })
}

export const manageUserRoleSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset
  }).options({ allowUnknown: true }),
  body: Joi.object({
    managedUserId: Joi.string(),
    managedUserConnectId: Joi.string(),
    newRole: Joi.string().allow(null),
    secret: Joi.string()
  }),
  params: Joi.object({
    containerID: Joi.string().required()
  })
}

export const addUserSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset
  }).options({ allowUnknown: true }),
  body: Joi.object({
    userId: Joi.string().required(),
    role: Joi.string().required()
  }),
  params: Joi.object({
    containerID: Joi.string().required()
  })
}

export const getArchiveSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset
  }).options({ allowUnknown: true }),
  params: Joi.object({
    containerID: Joi.string().required(),
    manuscriptID: Joi.string()
  }),
  query: Joi.object({
    allowOrphanedDocs: Joi.string()
  })
}

export const getPickerBuilderSchema: Joi.SchemaMap = {
  headers: Joi.object({
    accept: appJsonAndCharset
  }).options({ allowUnknown: true }),
  params: Joi.object({
    containerID: Joi.string().required(),
    manuscriptID: Joi.string().required()
  })
}

export const accessTokenSchema: Joi.SchemaMap = {
  params: Joi.object({
    containerType: Joi.string().required(),
    containerID: Joi.string().required(),
    scope: Joi.string().required()
  })
}

export const accessTokenJWKSchema: Joi.SchemaMap = {
  params: Joi.object({
    containerType: Joi.string().required(),
    scope: Joi.string().required()
  })
}

export const createManuscriptSchema: Joi.SchemaMap = {
  params: Joi.object({
    containerID: Joi.string().required(),
    manuscriptID: Joi.string()
  }),
  body: Joi.object({
    templateId: Joi.string()
  })
}

export const getProductionNotesSchema: Joi.SchemaMap = {
  params: Joi.object({
    containerID: Joi.string().required(),
    manuscriptID: Joi.string().required()
  })
}

export const addProductionNoteSchema: Joi.SchemaMap = {
  params: Joi.object({
    containerID: Joi.string().required(),
    manuscriptID: Joi.string().required()
  }),
  body: Joi.object({
    content: Joi.string().required(),
    connectUserID: Joi.string().required(),
    source: Joi.string().required().valid('EDITOR', 'EMAIL', 'DASHBOARD'),
    target: Joi.string()
  })
}

export const addExternalFiles: Joi.SchemaMap = {
  body: Joi.object({
    content: Joi.array().required()
  })
}

export const updateExternalFile: Joi.SchemaMap = {
  params: Joi.object({
    externalFileID: Joi.string().required()
  }),
  body: Joi.object({
    content: Joi.object().required()
  })
}

export const suggestionStatusSchema: Joi.SchemaMap = {
  params: Joi.object({
    containerID: Joi.string().required()
  })
}

export const createSnapshotSchema: Joi.SchemaMap = {
  params: Joi.object({
    containerID: Joi.string().required()
  })
}
