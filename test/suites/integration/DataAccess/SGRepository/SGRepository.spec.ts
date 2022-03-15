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

import { v4 as uuid_v4 } from 'uuid'
import {
  ContainerInvitation
} from '@manuscripts/manuscripts-json-schema'
import { PatchProject } from '../../../../../src/Models/ProjectModels'

import { ProjectRepository } from '../../../../../src/DataAccess/ProjectRepository/ProjectRepository'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { log } from '../../../../../src/Utilities/Logger'
import {
  validProject,
  validProjectNotInDB,
  validProject2
} from '../../../../data/fixtures/projects'
import { ValidationError, SyncError, DatabaseError } from '../../../../../src/Errors'
import { drop, seed, dropBucket, testDatabase } from '../../../../utilities/db'
import { InvitationRepository } from '../../../../../src/DataAccess/InvitationRepository/InvitationRepository'
import { ContainerInvitationRepository } from '../../../../../src/DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import {
  validProjectInvitation,
  validProjectInvitationObject
} from '../../../../data/fixtures/invitation'
import {
  validUserProfile2
} from '../../../../data/fixtures/UserRepository'
import { Bucket } from 'couchbase'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase(false, BucketKey.Data)))
afterAll(() => db.bucket.disconnect())

describe('SGRepository', () => {
  test('objectType… should match expectation', () => {
    log.info('Testing objectType…')
    const repository = new ProjectRepository(BucketKey.Data, db)
    expect(repository.objectType).toBe('MPProject')
  })
})

describe('SGRepository Create', () => {
  beforeEach(async () => {
    await drop()
    // await dropBucket(BucketKey.Data)
    await seed({ projects: true })
  })

  test('should create project successfully', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)

    await repository.create(validProjectNotInDB, {})
    const project: any = await repository.getById(validProjectNotInDB._id)
    expect(project._id).toBe(`MPProject:${validProjectNotInDB._id}`)
  })

  test('should fail to create project if the project already exists', () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    return expect(repository.create(validProject, {})).rejects.toThrowError(
      DatabaseError
    )
  })
})

describe('SGRepository update', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projectInvitations: true })
  })

  const invitation: ContainerInvitation = {
    _id: 'id',
    objectType: 'MPContainerInvitation',
    containerID: 'MPProject:id',
    message: validProjectInvitation.message,
    invitingUserProfile: {
      ...validUserProfile2,
      createdAt: new Date().getMilliseconds() - 1000,
      updatedAt: new Date().getMilliseconds()
    },
    invitedUserEmail: validProjectInvitation.invitedUsers[0].email,
    invitedUserName: validProjectInvitation.invitedUsers[0].name,
    invitingUserID: 'User_foo',
    role: validProjectInvitation.role,
    createdAt: new Date().getMilliseconds() - 1000,
    updatedAt: new Date().getMilliseconds()
  }

  test('should fail if id does not exists in the database', () => {
    const repository = new ContainerInvitationRepository(BucketKey.Data, db)

    return expect(
      repository.update('not-in-db', invitation, {})
    ).rejects.toThrowError(ValidationError)
  })

  test('should update user role successfully', async () => {
    const repository = new ContainerInvitationRepository(BucketKey.Data, db)
    const beforeUpdate: any = await repository.getById(
      validProjectInvitationObject._id
    )
    expect(beforeUpdate.role).toBe('Viewer')

    const projectInvitationUpdatedData = {
      ...validProjectInvitationObject,
      role: 'Writer'
    }

    await repository.update(
      validProjectInvitationObject._id,
      projectInvitationUpdatedData as ContainerInvitation,
      {}
    )
    const afterUpdate: any = await repository.getById(
      validProjectInvitationObject._id
    )
    expect(afterUpdate.role).toBe('Writer')
  })
})

describe('SGRepository patch', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projects: true })
  })

  test('should fail if id does not exists in the database', () => {
    const repository = new ProjectRepository(BucketKey.Data, db)

    return expect(
      repository.patch('not-in-db', validProject, {})
    ).rejects.toThrowError(ValidationError)
  })

  test('should patch user successfully', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    const beforeUpdate: any = await repository.getById(validProject2._id)
    expect(beforeUpdate.owners[0]).toBe('User_test')
    const projectUpdatedData: PatchProject = {
      _id: validProject2._id,
      writers: ['User_test2']
    }

    await repository.patch(validProject2._id, projectUpdatedData, {})
    const afterUpdate: any = await repository.getById(validProject2._id)
    expect(afterUpdate.owners[0]).toBe('User_test')
    expect(afterUpdate.writers[0]).toBe('User_test2')
  })
})

describe('SGRepository touch', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ invitations: true })
  })

  test('should fail if id does not exists in the database', () => {
    const repository = new InvitationRepository(BucketKey.Data, db)
    return expect(repository.touch('not-in-db', 1)).rejects.toThrowError(
      ValidationError
    )
  })
})

describe('SGRepository remove', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projects: true })
  })

  test('should remove the document by id', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    await repository.remove(validProject2._id)
    const project = await repository.getById(validProject2._id)
    expect(project).toBeNull()
  })

  test('should not fail if the document is not in db', () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    const id = uuid_v4()
    return expect(repository.remove(id)).resolves.not.toThrowError()
  })

  test('should remove all documents when the id given is null', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    await repository.remove(null)
  })
})

describe('SGRepository bulkDocs', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projects: true })
  })

  test('should update a title using bulkDocs', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    const project: any = await repository.getById(validProject2._id)
    await repository.bulkDocs([{ ...project, title: 'foo' }])
    const updatedProject: any = await repository.getById(validProject2._id)
    expect(updatedProject.title).toBe('foo')
  })
})

describe('SGRepository getById', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ projects: true })
  })

  test('should return null if key not exists', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    const id = uuid_v4()
    const project = await repository.getById(id)
    expect(project).toBeNull()
  })

  test('should get project by id successfully', async () => {
    const repository = new ProjectRepository(BucketKey.Data, db)
    const project: any = await repository.getById(validProject._id)

    expect(project._id).toBe(validProject._id)
  })
})
