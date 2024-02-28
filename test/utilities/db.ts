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

import checksum from 'checksum'
import * as _ from 'lodash'

import { BucketKey } from '../../src/Config/ConfigurationTypes'
import { SeedOptions } from '../../src/DataAccess/Interfaces/SeedOptions'
import { DIContainer } from '../../src/DIContainer/DIContainer'
import { NoBucketError } from '../../src/Errors'
import { applicationList } from '../data/dump/applications'
import { containerRequestList } from '../data/dump/containerRequest'
import { invitationsList } from '../data/dump/invitation'
import { invitationTokenList } from '../data/dump/invitationTokens'
//import { validManuscript, validManuscript1 } from '../data/fixtures/manuscripts'
import { manuscriptList } from '../data/dump/manuscriptList'
import { manuscriptNoteList } from '../data/dump/manuscriptNotes'
import { projectsList } from '../data/dump/project'
import { projectInvitationsList } from '../data/dump/projectInvitation'
import { templates } from '../data/dump/templates'
import { singleUseTokens, userList } from '../data/dump/user'
import { userProfileList } from '../data/dump/userProfile'
import { userStatusList } from '../data/dump/userStatus'
import { userTokensList } from '../data/dump/userToken'

async function createUsers(): Promise<void> {
  const { userRepository, userEmailRepository } = DIContainer.sharedContainer
  for (const user of userList) {
    await userRepository.create(_.clone(user))
    await userEmailRepository.create({ _id: checksum(user.email, { algorithm: 'sha1' }) })
  }
}

async function createUserStatus(): Promise<void> {
  for (const status of userStatusList) {
    await DIContainer.sharedContainer.userStatusRepository.create(_.clone(status))
  }
}

async function createApplications(): Promise<void> {
  for (const application of applicationList) {
    await DIContainer.sharedContainer.applicationRepository.create(_.clone(application))
  }
}

async function createSingleUseTokens(): Promise<void> {
  const singleUseTokenRepository = DIContainer.sharedContainer.singleUseTokenRepository
  for (const token of singleUseTokens) {
    await singleUseTokenRepository.create(_.clone(token))
  }
}

async function createInvitationTokens(): Promise<void> {
  for (const token of invitationTokenList) {
    await DIContainer.sharedContainer.invitationTokenRepository.create(_.clone(token))
  }
}

async function createInvitations(): Promise<void> {
  for (const invitation of invitationsList) {
    await DIContainer.sharedContainer.invitationRepository.create(_.clone(invitation))
  }
}

async function createProjectInvitations(): Promise<void> {
  for (const invitation of projectInvitationsList) {
    await DIContainer.sharedContainer.containerInvitationRepository.create(
      _.clone(invitation as any)
    )
  }
}
async function createUserProfiles(): Promise<void> {
  for (const userProfile of userProfileList) {
    await DIContainer.sharedContainer.userProfileRepository.create(_.clone(userProfile))
  }
}

async function createProjects(): Promise<void> {
  for (const project of projectsList) {
    await DIContainer.sharedContainer.projectRepository.create(_.clone(project))
  }
}

async function createContainerRequests(): Promise<void> {
  for (const request of containerRequestList) {
    await DIContainer.sharedContainer.containerRequestRepository.create(_.clone(request))
  }
}

async function createManuscript(): Promise<void> {
  await DIContainer.sharedContainer.projectRepository.bulkUpsert(manuscriptList)
}

async function createManuscriptNotes(): Promise<void> {
  for (const note of manuscriptNoteList) {
    await DIContainer.sharedContainer.manuscriptNotesRepository.create(_.clone(note))
  }
}

async function createTemplates(): Promise<void> {
  for (const template of templates) {
    await DIContainer.sharedContainer.templateRepository.create(_.clone(template))
  }
}

let _db: any = null
export async function testDatabase(
  enableActivityTracking = false,
  bucketKey: BucketKey = BucketKey.User
) {
  if (_db === null) {
    const container = await DIContainer.init(enableActivityTracking)
    switch (bucketKey) {
      case BucketKey.User:
        _db = container.userBucket
        break
      case BucketKey.Project:
        _db = container.dataBucket
        break
    }

    ;(container as any).iamTokenVerifier = {
      verify: () => true,
      isValidIssuer: () => Promise.resolve(true),
      loginVerify: () => true,
    }
    if (!_db) {
      throw new NoBucketError(
        'Failed to initialize testDatabase()! Is the database definitely up and accessible, and are you sure mocks are alright?'
      )
    }
  }
  return _db
}

// tslint:disable-next-line:cyclomatic-complexity
export async function seed(options: SeedOptions): Promise<void> {
  await testDatabase()
  const storagePromises = []
  if (options.users) {
    storagePromises.push(createUsers())
    storagePromises.push(createUserStatus())
  }

  if (options.singleUseTokens) {
    storagePromises.push(createSingleUseTokens())
  }

  if (options.applications) {
    storagePromises.push(createApplications())
  }

  if (options.invitations) {
    storagePromises.push(createInvitations())
  }

  if (options.projects) {
    storagePromises.push(createProjects())
  }

  if (options.projectInvitations) {
    storagePromises.push(createProjectInvitations())
  }

  if (options.invitationTokens) {
    storagePromises.push(createInvitationTokens())
  }

  if (options.userProfiles) {
    storagePromises.push(createUserProfiles())
  }

  if (options.containerRequest) {
    storagePromises.push(createContainerRequests())
  }

  if (options.manuscript) {
    storagePromises.push(createManuscript())
  }

  if (options.manuscriptNotes) {
    storagePromises.push(createManuscriptNotes())
  }

  if (options.templates) {
    storagePromises.push(createTemplates())
  }

  await Promise.all(storagePromises)
}

export async function dropBucket(_bucketKey: BucketKey): Promise<void> {
  return DIContainer.sharedContainer.bucketForKey(_bucketKey).bucket.remove({})
}

export async function drop(): Promise<void> {
  await testDatabase()
  const repositories = DIContainer.sharedContainer.repositories

  const gatewayRepositories = DIContainer.sharedContainer.gatewayRepositories

  await Promise.all([
    ...(repositories.map((x) => x.remove(null)) as any),
    ...gatewayRepositories.map((x) => x.remove(null)),
  ])
}
