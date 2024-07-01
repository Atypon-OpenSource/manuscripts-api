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

export type PatchProject = {
  _id: string
  title?: string
  owners?: string[]
  writers?: string[]
  viewers?: string[]
  editors?: string[]
  annotators?: string[]
  proofers?: string[]
}
export enum ProjectUserRole {
  Owner = 'Owner',
  Writer = 'Writer',
  Viewer = 'Viewer',
  Editor = 'Editor',
  Proofer = 'Proofer',
  Annotator = 'Annotator',
}
export enum ProjectPermission {
  READ,
  UPDATE,
  DELETE,
  UPDATE_ROLES,
  CREATE_MANUSCRIPT,
}
export type ArchiveOptions = {
  getAttachments?: boolean
  onlyIDs?: boolean
  includeExt: boolean | true
  types?: string[]
}
