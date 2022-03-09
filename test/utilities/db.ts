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

import * as _ from 'lodash'
import request from 'request-promise-native'
import checksum from 'checksum'

import { appDataAdminGatewayURI } from '../../src/Config/ConfigAccessors'
import { BucketKey } from '../../src/Config/ConfigurationTypes'
import { singleUseTokens, userList } from '../data/dump/user'
import { userStatusList } from '../data/dump/userStatus'
import { invitationsList } from '../data/dump/invitation'
import { projectInvitationsList } from '../data/dump/projectInvitation'
import { applicationList } from '../data/dump/applications'
import { DIContainer } from '../../src/DIContainer/DIContainer'
import { NoBucketError } from '../../src/Errors'
import { SeedOptions } from '../../src/DataAccess/Interfaces/SeedOptions'
import { projectsList } from '../data/dump/project'
import { invitationTokenList } from '../data/dump/invitationTokens'
import { userProfileList } from '../data/dump/userProfile'
import { userTokensList } from '../data/dump/userToken'
import { containerRequestList } from '../data/dump/containerRequest'
import { submissionsList } from '../data/dump/submissions'
import { validManuscript, validManuscript1 } from '../data/fixtures/manuscripts'
import { manuscriptList } from '../data/dump/manuscriptList'
import { manuscriptNoteList } from '../data/dump/manuscriptNotes'
import { externalFileList } from '../data/dump/externalFilesList'
import { correctionList } from '../data/dump/correctionList'
import { templates } from '../data/dump/templates'
import { librariesList } from '../data/dump/library'
import { libraryCollectionsList } from '../data/dump/libraryCollection'
import { libraryInvitationsList } from '../data/dump/libraryInvitation'
import { snapshotList } from '../data/dump/SnapshotList'

async function createUsers (): Promise<void> {
  const { userRepository, userEmailRepository } = DIContainer.sharedContainer
  for (const user of userList) {
    await userRepository.create(_.clone(user), {})
    await userEmailRepository.create(
      { _id: checksum(user.email, { algorithm: 'sha1' }) },
      {}
    )
  }
}

async function createUserStatus (): Promise<void> {
  for (const status of userStatusList) {
    await DIContainer.sharedContainer.userStatusRepository.create(
      _.clone(status),
      {}
    )
  }
}

async function createApplications (): Promise<void> {
  for (const application of applicationList) {
    await DIContainer.sharedContainer.applicationRepository.create(
      _.clone(application),
      {}
    )
  }
}

async function createSingleUseTokens (): Promise<void> {
  const singleUseTokenRepository =
    DIContainer.sharedContainer.singleUseTokenRepository
  for (const token of singleUseTokens) {
    await singleUseTokenRepository.create(_.clone(token), {})
  }
}

async function createInvitationTokens (): Promise<void> {
  for (const token of invitationTokenList) {
    await DIContainer.sharedContainer.invitationTokenRepository.create(
      _.clone(token),
      {}
    )
  }
}

async function createInvitations (): Promise<void> {
  for (const invitation of invitationsList) {
    await DIContainer.sharedContainer.invitationRepository.create(
      _.clone(invitation),
      {}
    )
  }
}

async function createProjectInvitations (): Promise<void> {
  for (const invitation of projectInvitationsList) {
    await DIContainer.sharedContainer.containerInvitationRepository.create(
      _.clone(invitation),
      {}
    )
  }
}

async function createLibraryInvitations (): Promise<void> {
  for (const invitation of libraryInvitationsList) {
    await DIContainer.sharedContainer.containerInvitationRepository.create(
      _.clone(invitation),
      {}
    )
  }
}

async function createUserProfiles (): Promise<void> {
  for (const userProfile of userProfileList) {
    await DIContainer.sharedContainer.userProfileRepository.create(
      _.clone(userProfile),
      {}
    )
  }
}

async function createUserTokens (): Promise<void> {
  for (const userToken of userTokensList) {
    await DIContainer.sharedContainer.userTokenRepository.create(
      _.clone(userToken),
      {}
    )
  }
}

async function createProjects (): Promise<void> {
  for (const project of projectsList) {
    await DIContainer.sharedContainer.projectRepository.create(
      _.clone(project),
      {}
    )
  }
}

async function createLibraries (): Promise<void> {
  for (const library of librariesList) {
    await DIContainer.sharedContainer.libraryRepository.create(
      _.clone(library),
      {}
    )
  }
}

async function createLibraryCollections (): Promise<void> {
  for (const libraryCollection of libraryCollectionsList) {
    await DIContainer.sharedContainer.libraryCollectionRepository.create(
      _.clone(libraryCollection),
      {}
    )
  }
}

async function createContainerRequests (): Promise<void> {
  for (const request of containerRequestList) {
    await DIContainer.sharedContainer.containerRequestRepository.create(
    _.clone(request),
    {}
    )
  }
}

async function createSubmission (): Promise<void> {
  for (const submission of submissionsList) {
    await DIContainer.sharedContainer.submissionRepository.create(
      _.clone(submission),
      {}
    )
  }
}

async function createManuscript (): Promise<void> {
  await DIContainer.sharedContainer.projectRepository.bulkDocs(manuscriptList)
}

async function createManuscriptNotes (): Promise<void> {
  for (const note of manuscriptNoteList) {
    await DIContainer.sharedContainer.manuscriptNotesRepository.create(
      _.clone(note),
      {}
    )
  }
}

async function createExternalFile (): Promise<void> {
  for (const externalFile of externalFileList) {
    await DIContainer.sharedContainer.externalFileRepository.create(
      _.clone(externalFile),
      {}
    )
  }
}

async function createCorrections (): Promise<void> {
  for (const externalFile of correctionList) {
    await DIContainer.sharedContainer.correctionRepository.create(
      _.clone(externalFile),
      {}
    )
  }
}

async function createTemplates (): Promise<void> {
  for (const template of templates) {
    await DIContainer.sharedContainer.templateRepository.create(
      _.clone(template),
      {}
    )
  }
}

async function createSnapshot (): Promise<void> {
  for (const template of snapshotList) {
    await DIContainer.sharedContainer.snapshotRepository.create(
      _.clone(template),
      {}
    )
  }
}

let _db: any = null
export async function testDatabase (
  enableActivityTracking: boolean = false,
  bucketKey: BucketKey = BucketKey.User
) {
  if (_db === null) {
    const container = await DIContainer.init(
      enableActivityTracking
    )
    switch (bucketKey) {
      case BucketKey.User: _db = container.userBucket
        break
      case BucketKey.Data: _db = container.dataBucket
        break
      case BucketKey.DerivedData: _db = container.derivedDataBucket
    }

    (container as any).jwksClient = {
      getSigningKey: (_: string, callback: Function) => {
        callback(null, {
          rsaPublicKey:
            'public-key-that-will-not-be-used-because-the-iam-token-verified-below-is-faked-too'
        })
      }
    };
    (container as any).iamTokenVerifier = {
      verify: () => true,
      isValidIssuer: () => Promise.resolve(true),
      loginVerify: () => true
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
export async function seed (options: SeedOptions): Promise<void> {
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

  if (options.libraries) {
    storagePromises.push(createLibraries())
  }

  if (options.libraryCollections) {
    storagePromises.push(createLibraryCollections())
  }

  if (options.projectInvitations) {
    storagePromises.push(createProjectInvitations())
  }

  if (options.libraryInvitations) {
    storagePromises.push(createLibraryInvitations())
  }

  if (options.invitationTokens) {
    storagePromises.push(createInvitationTokens())
  }

  if (options.userProfiles) {
    storagePromises.push(createUserProfiles())
  }

  if (options.userTokens) {
    storagePromises.push(createUserTokens())
  }

  if (options.containerRequest) {
    storagePromises.push(createContainerRequests())
  }

  if (options.submission) {
    storagePromises.push(createSubmission())
  }

  if (options.manuscript) {
    storagePromises.push(createManuscript())
  }

  if (options.manuscriptNotes) {
    storagePromises.push(createManuscriptNotes())
  }

  if (options.externalFile) {
    storagePromises.push(createExternalFile())
  }

  if (options.corrections) {
    storagePromises.push(createCorrections())
  }

  if (options.templates) {
    storagePromises.push(createTemplates())
  }

  if (options.snapshots) {
    storagePromises.push(createSnapshot())
  }

  await Promise.all(storagePromises)
}

const syncGatewayRepositories = new Set<string>([
  'MPProject',
  'MPCollaboration',
  'MPUserProfile',
  'MPContainerInvitation',
  'MPInvitation',
  'MPContainerRequest',
  'MPSubmission',
  'MPManuscriptNote',
  'MPCorrection',
  'MPLibrary',
  'MPLibraryCollection',
  'MPSnapshot'
])

const derivedBucketRepositories = new Set<string>([
  'MPUserCollaborator'
])

export async function dropBucket (bucketKey: BucketKey): Promise<void> {
  return
  /*let payload = projectsList.reduce((acc: any, doc: any) => {
    acc['MPProject:' + doc._id] = ['*']
    return acc
  }, {})
  payload[validManuscript._id] = ['*']
  payload[validManuscript1._id] = ['*']
  await purge(bucketKey, payload)

  payload = manuscriptNoteList.reduce((acc: any, doc: any) => {
    acc[doc._id] = ['*']
    return acc
  }, {})
  await purge(bucketKey, payload)

  payload = externalFileList.reduce((acc: any, doc: any) => {
    acc[doc._id] = ['*']
    return acc
  }, {})
  await purge(bucketKey, payload)

  payload = correctionList.reduce((acc: any, doc: any) => {
    acc[doc._id] = ['*']
    return acc
  }, {})
  await purge(bucketKey, payload)

  payload = templates.reduce((acc: any, doc: any) => {
    acc[doc._id] = ['*']
    return acc
  }, {})
  await purge(bucketKey, payload)

  payload = snapshotList.reduce((acc: any, doc: any) => {
    acc[doc._id] = ['*']
    return acc
  }, {})
  await purge(bucketKey, payload)

  payload = libraryCollectionsList.reduce((acc: any, doc: any) => {
    acc['MPLibraryCollection:' + doc._id] = ['*']
    return acc
  }, {})
  await purge(bucketKey, payload)

  payload = projectInvitationsList.reduce((acc: any, doc: any) => {
    acc['MPContainerInvitation:' + doc._id] = ['*']
    return acc
  }, {})
  await purge(bucketKey, payload)

  payload = containerRequestList.reduce((acc: any, doc: any) => {
    acc['MPContainerRequest:' + doc._id] = ['*']
    return acc
  }, {})
  await purge(bucketKey, payload)

  payload = librariesList.reduce((acc: any, doc: any) => {
    acc['MPLibrary:' + doc._id] = ['*']
    return acc
  }, {})
  await purge(bucketKey, payload)

  payload = invitationsList.reduce((acc: any, doc: any) => {
    acc['MPInvitation:' + doc._id] = ['*']
    return acc
  }, {})
  await purge(bucketKey, payload)*/
}

async function purge (bucketKey: BucketKey, payload: any) {
  await request({
    method: 'POST',
    uri: `${appDataAdminGatewayURI(bucketKey)}/_purge`,
    json: true,
    body: payload,
    resolveWithFullResponse: true,
    simple: false
  })
}

export async function drop (): Promise<void> {
  await testDatabase()
  const repositories = DIContainer.sharedContainer.repositories/*.filter(
    (x: any) =>
      !syncGatewayRepositories.has(x.objectType) &&
      !derivedBucketRepositories.has(x.objectType)
  )*/

  const gatewayRepositories = DIContainer.sharedContainer.gatewayRepositories/*.filter(
    (x: any) =>
      syncGatewayRepositories.has(x.objectType)
  )*/

  await Promise.all([
    ...repositories.map(x => x.remove(null)) as any,
    ...gatewayRepositories.map(x => x.remove(null))
  ])
}
