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

export const createDocumentSchema: Joi.SchemaMap = {
  params: Joi.object({
    projectID: Joi.string().required(),
    manuscriptID: Joi.string().required(),
  }),
  body: Joi.object({
    manuscript_model_id: Joi.object().required(),
    project_model_id: Joi.object().required(),
    doc: Joi.object().required(),
  }),
}
export const updateDocumentSchema: Joi.SchemaMap = {
  params: Joi.object({
    projectID: Joi.string().required(),
    manuscriptID: Joi.string().required(),
  }),
  body: Joi.object({
    doc: Joi.object().required(),
  }),
}
export const getDocumentSchema: Joi.SchemaMap = {
  params: Joi.object({
    projectID: Joi.string().required(),
    manuscriptID: Joi.string().required(),
  }),
}
export const deleteDocumentSchema: Joi.SchemaMap = {
  params: Joi.object({
    projectID: Joi.string().required(),
    manuscriptID: Joi.string().required(),
  }),
}

export const createSnapshotSchema: Joi.SchemaMap = {
  params: Joi.object({
    projectID: Joi.string().required(),
    manuscriptID: Joi.string().required(),
  }),
  body: Joi.object({
    name: Joi.string().required(),
    docId: Joi.string().required(),
    snapshot: Joi.object().required(),
  }),
}
export const getSnapshotSchema: Joi.SchemaMap = {
  params: Joi.object({
    snapshotID: Joi.string().required(),
  }),
}
export const getSnapshotLabelsSchema: Joi.SchemaMap = {
  params: Joi.object({
    projectID: Joi.string().required(),
    manuscriptID: Joi.string().required(),
  }),
}
export const deleteSnapshotSchema: Joi.SchemaMap = {
  params: Joi.object({
    snapshotID: Joi.string().required(),
  }),
}
