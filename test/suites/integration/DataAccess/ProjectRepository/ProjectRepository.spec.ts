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

import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { ContainerInvitationRepository } from '../../../../../src/DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { ProjectRepository } from '../../../../../src/DataAccess/ProjectRepository/ProjectRepository'
import { createProjectInvitation } from '../../../../data/fixtures/misc'
import { validProject } from '../../../../data/fixtures/projects'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase(false, BucketKey.Project)))
afterAll(() => db.bucket.disconnect())

describe('ProjectRepository removeWithAllResources', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projects: true })
  })

  test('should remove project with all its resources', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    const projectInvitationRepository = new ContainerInvitationRepository(BucketKey.Project, db)
    const validId = `MPProject:valid-project-id-6`
    const projectBefore = await repository.getById(validId)
    const invId =
      'MPContainerInvitation:' +
      checksum('valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-6', {
        algorithm: 'sha1',
      })
    await createProjectInvitation(invId)
    const invitationBefore = await projectInvitationRepository.getById(invId)

    expect(projectBefore!._id).toBe(validId)
    expect(invitationBefore).not.toBeNull()

    await repository.removeWithAllResources(validId)

    const projectAfter = await repository.getById(validId)
    const invitationAfter = await projectInvitationRepository.getById(
      'MPContainerInvitation:' +
        checksum(
          'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-6',
          { algorithm: 'sha1' }
        )
    )

    expect(projectAfter).toBeNull()
    expect(invitationAfter).toBeNull()
  })
})

describe('ProjectRepository getUserContainers', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projects: true })
  })

  test('should get project by user id', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    const validUserId = 'User_test'
    const projects = await repository.getUserContainers(validUserId)

    expect(projects.find((project: { _id: string }) => project._id === validProject._id)._id).toBe(
      validProject._id
    )
  })
})

describe('ProjectRepository getContainerResourcesIDs', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projects: true, projectInvitations: true })
  })

  test('should get resources ids', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    const validId = `MPProject:valid-project-id-6`
    const resources = await repository.getContainerResourcesIDs(validId)

    expect(resources.find((resource: { _id: string }) => resource._id === validId)._id).toBe(
      validId
    )
  })
})
