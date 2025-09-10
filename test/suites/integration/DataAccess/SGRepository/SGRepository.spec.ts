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

import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { ContainerInvitationRepository } from '../../../../../src/DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { InvitationRepository } from '../../../../../src/DataAccess/InvitationRepository/InvitationRepository'
import { ProjectRepository } from '../../../../../src/DataAccess/ProjectRepository/ProjectRepository'
import { DatabaseError, ValidationError } from '../../../../../src/Errors'
import { PatchProject } from '../../../../../src/Models/ProjectModels'
import { log } from '../../../../../src/Utilities/Logger'
import { validProjectInvitationObject } from '../../../../data/fixtures/invitation'
import {
  validProject,
  validProject2,
  validProjectNotInDB,
} from '../../../../data/fixtures/projects'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase(false, BucketKey.Project)))
afterAll(() => db.bucket.disconnect())

describe('SGRepository', () => {
  test('objectType… should match expectation', () => {
    log.info('Testing objectType…')
    const repository = new ProjectRepository(BucketKey.Project, db)
    expect(repository.objectType).toBe('MPProject')
  })
})

describe('SGRepository Create', () => {
  beforeEach(async () => {
    await drop()
    // await dropBucket(BucketKey.Project)
    await seed({ projects: true })
  })

  test('should create project successfully', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)

    await repository.create(validProjectNotInDB)
    const project: any = await repository.getById(validProjectNotInDB._id)
    expect(project._id).toBe(`MPProject:${validProjectNotInDB._id}`)
  })

  test('should fail to create project if the project already exists', () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    return expect(repository.create(validProject)).rejects.toThrow(DatabaseError)
  })
})

describe('SGRepository update', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projectInvitations: true })
  })

  test('should update user role successfully', async () => {
    const repository = new ContainerInvitationRepository(BucketKey.Project, db)
    const beforeUpdate: any = await repository.getById(validProjectInvitationObject._id)
    expect(beforeUpdate.role).toBe('Viewer')

    const projectInvitationUpdatedData = {
      ...validProjectInvitationObject,
      role: 'Writer',
    }

    await repository.update(projectInvitationUpdatedData as any)
    const afterUpdate: any = await repository.getById(validProjectInvitationObject._id)
    expect(afterUpdate.role).toBe('Writer')
  })
})

describe('SGRepository patch', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projects: true })
  })

  test('should fail if id does not exists in the database', () => {
    const repository = new ProjectRepository(BucketKey.Project, db)

    return expect(repository.patch('not-in-db', validProject)).rejects.toThrow(ValidationError)
  })

  test('should patch user successfully', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    const beforeUpdate: any = await repository.getById(validProject2._id)
    expect(beforeUpdate.owners[0]).toBe('User_test')
    const projectUpdatedData: PatchProject = {
      _id: validProject2._id,
      writers: ['User_test2'],
    }

    await repository.patch(validProject2._id, projectUpdatedData)
    const afterUpdate: any = await repository.getById(validProject2._id)
    expect(afterUpdate.owners[0]).toBe('User_test')
    expect(afterUpdate.writers[0]).toBe('User_test2')
  })
})

describe('SGRepository touch', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ invitations: true })
  })

  test('should fail if id does not exists in the database', () => {
    const repository = new InvitationRepository(BucketKey.Project, db)
    return expect(repository.touch('not-in-db', 1)).rejects.toThrow(ValidationError)
  })
})

describe('SGRepository remove', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projects: true })
  })

  test('should remove the document by id', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    await repository.remove(validProject2._id)
    const project = await repository.getById(validProject2._id)
    expect(project).toBeNull()
  })

  test('should not fail if the document is not in db', () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    const id = uuid_v4()
    return expect(repository.remove(id)).resolves.not.toThrow()
  })

  test('should remove all documents when the id given is null', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    await repository.remove(null)
  })
})

describe('SGRepository bulkUpsert', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projects: true })
  })

  test('should update a title using bulkUpsert', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    const project: any = await repository.getById(validProject2._id)
    await repository.bulkUpsert([{ ...project, title: 'foo' }])
    const updatedProject: any = await repository.getById(validProject2._id)
    expect(updatedProject.title).toBe('foo')
  })

  test('random objects', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    const obj = {
      _id: 'MPCitation:A99098E0-476D-4930-ABF0-FE248A8BBA22',
      objectType: 'MPCitation',
      containingObject: 'MPParagraphElement:E51EFD7D-52FF-4B72-BF9C-B47F2989436F',
      embeddedCitationItems: [
        {
          _id: 'MPCitationItem:DB6896A8-C99B-41B2-B64A-30ECD96ED8AB',
          objectType: 'MPCitationItem',
          bibliographyItem: 'MPBibliographyItem:6C6AF046-1C45-4CC5-9F38-93BC736E5293',
        },
      ],
      containerID: 'MPProject:B81D5F33-6338-420C-AAEC-CF0CF33E675C',
      manuscriptID: 'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232',
    }
    await repository.bulkUpsert([{ ...obj }])
    const upsertedProject: any = await repository.getById(obj._id)
    expect(upsertedProject.containingObject).toBe(obj.containingObject)

    await repository.bulkUpsert([{ ...obj, containingObject: 'foo' }])
    const updatedProject: any = await repository.getById(obj._id)
    expect(updatedProject.containingObject).toBe('foo')
  })
})

describe('SGRepository getById', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ projects: true })
  })

  test('should return null if key not exists', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    const id = uuid_v4()
    const project = await repository.getById(id)
    expect(project).toBeNull()
  })

  test('should get project by id successfully', async () => {
    const repository = new ProjectRepository(BucketKey.Project, db)
    const project: any = await repository.getById(validProject._id)

    expect(project._id).toBe(validProject._id)
  })
})
