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

import _ from 'lodash'
import { projectsList } from '../dump/project'
import { DIContainer } from '../../../src/DIContainer/DIContainer'
import { librariesList } from '../dump/library'
import { libraryCollectionsList } from '../dump/libraryCollection'
import { projectInvitationsList } from '../dump/projectInvitation'
import { containerRequestList } from '../dump/containerRequest'
import { submissionsList } from '../dump/submissions'
import { libraryInvitationsList } from '../dump/libraryInvitation'
import { invitationsList } from '../dump/invitation'

export const GOOGLE_AUTH_URI = 'https://accounts.google.com/o/oauth2/v2/auth'

export async function createProject (id: string) {
  const project: any = _.clone(projectsList.find((project) => project._id === id))
  await DIContainer.sharedContainer.projectRepository.create(
    project,
    {}
  )
}

export async function createLibrary (id: string) {
  const library: any = _.clone(librariesList.find((library) => library._id === id))
  await DIContainer.sharedContainer.libraryRepository.create(
    _.clone(library),
    {}
  )
}

export async function createLibraryCollection () {
  const libraryCollection: any = _.clone(libraryCollectionsList[0])
  await DIContainer.sharedContainer.libraryCollectionRepository.create(
    _.clone(libraryCollection),
    {}
  )
}

export async function purgeContainerReq (id: string) {
  await DIContainer.sharedContainer.containerRequestRepository.purge(id)
}

export async function purgeContainerInvitation (id: string) {
  await DIContainer.sharedContainer.containerInvitationRepository.purge(id)
}

export async function createContainerReq (id: string) {
  await DIContainer.sharedContainer.containerRequestRepository.purge(id)
  const invitation: any = _.clone(containerRequestList.find((invitation) => invitation._id === id))
  await DIContainer.sharedContainer.containerRequestRepository.create(
    _.clone(invitation),
    {}
  )
}

export async function createSubmission (id: string) {
  await DIContainer.sharedContainer.submissionRepository.purge(id)
  const sub: any = _.clone(submissionsList.find((sub) => sub._id === id))
  await DIContainer.sharedContainer.submissionRepository.create(
    _.clone(sub),
    {}
  )
}

export async function createProjectInvitation (id: string) {
  const projectInvitation: any = _.clone(projectInvitationsList.find((projectInvitation) => {
    return projectInvitation._id === id
  }))
  await DIContainer.sharedContainer.containerInvitationRepository.create(
    _.clone(projectInvitation),
    {}
  )
}

export async function createLibraryInvitation (id: string) {
  const invitation: any = _.clone(libraryInvitationsList.find((invitation) => invitation._id === id))
  await DIContainer.sharedContainer.containerInvitationRepository.create(
    _.clone(invitation),
    {}
  )
}

export async function createInvitation (id: string) {
  const invitation: any = _.clone(invitationsList.find((invitation) => invitation._id === id))
  await DIContainer.sharedContainer.invitationRepository.create(
    _.clone(invitation),
    {}
  )
}
