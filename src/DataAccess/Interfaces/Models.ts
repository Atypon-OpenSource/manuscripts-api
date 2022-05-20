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

import {
  Invitation,
  Project,
  Library,
  LibraryCollection,
  ContainerInvitation,
  Collaboration,
  UserProfile,
  ContainerRequest,
  Submission,
  ManuscriptNote,
  ExternalFile,
  Manuscript,
  Correction,
  ManuscriptTemplate,
  Snapshot,
} from '@manuscripts/manuscripts-json-schema'

export type ProjectLike = Pick<Project, Exclude<keyof Project, 'createdAt' | 'updatedAt'>>

export type LibraryLike = Pick<Library, Exclude<keyof Library, 'createdAt' | 'updatedAt'>>

export type LibraryCollectionLike = Pick<
  LibraryCollection,
  Exclude<keyof LibraryCollection, 'createdAt' | 'updatedAt'>
>

export type InvitationLike = Pick<Invitation, Exclude<keyof Invitation, 'createdAt' | 'updatedAt'>>

export type UserProfileLike = Pick<
  UserProfile,
  Exclude<keyof UserProfile, 'createdAt' | 'updatedAt'>
>

export type ContainerInvitationLike = Pick<
  ContainerInvitation,
  Exclude<keyof ContainerInvitation, 'createdAt' | 'updatedAt'>
> & { expiry: number }

export type CollaborationLike = Pick<
  Collaboration,
  Exclude<keyof Collaboration, 'createdAt' | 'updatedAt'>
>

export type ContainerRequestLike = Pick<
  ContainerRequest,
  Exclude<keyof ContainerRequest, 'createdAt' | 'updatedAt'>
>

export type SubmissionLike = Pick<Submission, Exclude<keyof Submission, 'createdAt' | 'updatedAt'>>

export type ManuscriptNoteLike = Pick<
  ManuscriptNote,
  Exclude<keyof ManuscriptNote, 'createdAt' | 'updatedAt'>
>

export type ManuscriptLike = Pick<Manuscript, Exclude<keyof Manuscript, 'createdAt' | 'updatedAt'>>

export type ExternalFileLike = Pick<
  ExternalFile,
  Exclude<keyof ExternalFile, 'createdAt' | 'updatedAt'>
>

export type CorrectionLike = Pick<Correction, Exclude<keyof Correction, 'createdAt' | 'updatedAt'>>

export type ManuscriptTemplateLike = Pick<
  ManuscriptTemplate,
  Exclude<keyof ManuscriptTemplate, 'createdAt' | 'updatedAt'>
>

export type SnapshotLike = Pick<Snapshot, Exclude<keyof Snapshot, 'createdAt' | 'updatedAt'>>

export type PrismaModelLike = {
  id: string
  data: any
}
