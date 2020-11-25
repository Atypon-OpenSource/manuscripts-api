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

import { drop, testDatabase, seed, dropBucket } from '../../../../utilities/db'
import checksum from 'checksum'

import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { ProjectRepository } from '../../../../../src/DataAccess/ProjectRepository/ProjectRepository'
import { validProject } from '../../../../data/fixtures/projects'
import { ContainerInvitationRepository } from '../../../../../src/DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { ValidationError } from '../../../../../src/Errors'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase(false, false, BucketKey.Data)))
afterAll(() => db.bucket.disconnect())

describe('ProjectRepository removeWithAllResources', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projects: true, projectInvitations: true })
  })

  test('should remove project with all its resources', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    const projectInvitationRepository = new ContainerInvitationRepository(
      BucketKey.Data,
      db
    )
    const validId = `MPProject:valid-project-id-6`
    const projectBefore = await repository.getById(validId)
    const invitationBefore = await projectInvitationRepository.getById(
      checksum(
        'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-6',
        { algorithm: 'sha1' }
      )
    )

    expect(projectBefore!._id).toBe(validId)
    expect(invitationBefore).not.toBeNull()

    await repository.removeWithAllResources(validId)

    const projectAfter = await repository.getById(validId)
    const invitationAfter = await projectInvitationRepository.getById(
      checksum(
        'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-project-id-6',
        { algorithm: 'sha1' }
      )
    )

    expect(projectAfter).toBeNull()
    expect(invitationAfter).toBeNull()
  })

  test('should fail to remove project if id is missing', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)

    return expect(
      repository.removeWithAllResources(null as any)
    ).rejects.toThrowError(ValidationError)
  })
})

describe('ProjectRepository getUserProjects', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projects: true })
  })

  test('should get project by user id', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    const validUserId = 'User_test'
    const projects = await repository.getUserProjects(validUserId)

    expect(
      projects.find(
        (project) => project._id === `MPProject:${validProject._id}`
      )!._id
    ).toBe(`MPProject:${validProject._id}`)
  })
})

describe('ProjectRepository getContainerResourcesIDs', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projects: true, projectInvitations: true })
  })

  test('should get resources ids', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    const validId = `MPProject:valid-project-id-6`
    const resources = await repository.getContainerResourcesIDs(validId)

    expect(resources!.find((resource) => resource._id === validId)!._id).toBe(
      validId
    )
  })
})

describe('ProjectRepository getContainerResourcesIDs', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projects: true, projectInvitations: true })
  })

  test('should get resources ids', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    const validId = `MPProject:valid-project-id-6`
    const resources = await repository.getContainerResourcesIDs(validId)

    expect(resources!.find((resource) => resource._id === validId)!._id).toBe(
      validId
    )
  })
})
