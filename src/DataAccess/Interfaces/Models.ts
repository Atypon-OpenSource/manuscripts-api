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
  ContainerInvitation,
  Collaboration,
  UserProfile,
  ContainerRequest,
  Submission,
  ManuscriptNote
} from '@manuscripts/manuscripts-json-schema'

export type ProjectLike = Pick<
  Project,
  Exclude<keyof Project, 'createdAt' | 'updatedAt'>
>

export type InvitationLike = Pick<
  Invitation,
  Exclude<keyof Invitation, 'createdAt' | 'updatedAt'>
>

export type UserProfileLike = Pick<
  UserProfile,
  Exclude<keyof UserProfile, 'createdAt' | 'updatedAt'>
>

export type ContainerInvitationLike = Pick<
  ContainerInvitation,
  Exclude<keyof ContainerInvitation, 'createdAt' | 'updatedAt'>
>

export type CollaborationLike = Pick<
  Collaboration,
  Exclude<keyof Collaboration, 'createdAt' | 'updatedAt'>
>

export type ContainerRequestLike = Pick<
  ContainerRequest,
  Exclude<keyof ContainerRequest, 'createdAt' | 'updatedAt'>
>

export type SubmissionLike = Pick<
  Submission,
  Exclude<keyof Submission, 'createdAt' | 'updatedAt'>
>

export type ManuscriptNoteLike = Pick<
  ManuscriptNote,
  Exclude<keyof ManuscriptNote, 'createdAt' | 'updatedAt'>
>
