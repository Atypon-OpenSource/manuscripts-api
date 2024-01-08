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

import '../../../utilities/dbMock'

import { DIContainer } from '../../../../src/DIContainer/DIContainer'
import { ValidationError } from '../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('SGRepository - create', () => {
  const project = {
    _id: 'MPProject:foo',
    owners: [],
    writers: [],
    viewers: [],
  }

  test('should create a document', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.database.bucket.insert.mockImplementationOnce((_document: any) =>
      Promise.resolve(project)
    )
    const created = await projectRepository.create(project)
    expect(created._id).toEqual('MPProject:foo')
  })

  test('should create a document with access control', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.database.bucket.insert.mockImplementationOnce((_document: any) =>
      Promise.resolve(project)
    )
    projectRepository.validate = jest.fn().mockResolvedValue(true)

    const created = await projectRepository.create(project, 'User_foo')
    expect(created._id).toEqual('MPProject:foo')
  })

  test('should fail to create a document', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    const errorObj = new Error('database derp')
    projectRepository.database.bucket.insert.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )
    return expect(projectRepository.create(project)).rejects.toThrow(Error)
  })

  test('should fail to create a document with access control', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    const errorObj = { forbidden: 'x' }
    projectRepository.validate = jest.fn().mockImplementationOnce(() => {
      throw errorObj
    })
    return expect(projectRepository.create(project, 'User_foo')).rejects.toThrow(Error)
  })
})

describe('SGRepository - getById', () => {
  const project = {
    _id: 'MPProject:foo',
    owners: [],
  }

  test('should get the document by Id', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.database.bucket.findUnique.mockImplementationOnce((_document: any) =>
      Promise.resolve({ data: project, _id: project._id })
    )

    const created = await projectRepository.getById(project._id)
    expect(created._id).toEqual('MPProject:foo')
  })

  test('should get the document by Id with access control', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.database.bucket.findUnique.mockImplementationOnce((_document: any) =>
      Promise.resolve({ data: project, _id: project._id })
    )
    projectRepository.validate = jest.fn().mockResolvedValue(true)

    const created = await projectRepository.getById(project._id, 'User_foo')
    expect(created._id).toEqual('MPProject:foo')
  })

  test('should return null if the document not exist', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.database.bucket.findUnique.mockImplementationOnce((_document: any) =>
      Promise.resolve(null)
    )

    const projectReturn = await projectRepository.getById(project._id)
    return expect(projectReturn).toBeNull()
  })

  test('failing to get a document should throw', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository

    const errorObj = new Error('database derp')
    projectRepository.database.bucket.findUnique.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )

    return expect(projectRepository.getById(project._id)).rejects.toThrow(Error)
  })
})

describe('SGRepository - patch', () => {
  const project = {
    _id: 'foo',
    owners: [],
    objectType: 'MPProject',
  }

  const projectToPatch = {
    _id: 'foo',
    owners: ['User_test'],
  }

  test('should patch the document', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve({ ...project })
    projectRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.resolve()
    )

    const patched = await projectRepository.patch(project._id, projectToPatch)
    expect(patched.owners[0]).toEqual(projectToPatch.owners[0])
  })

  test('should patch the document with access control', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve({ ...project })
    projectRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.resolve()
    )
    projectRepository.validate = jest.fn().mockResolvedValue(true)

    const patched = await projectRepository.patch(project._id, projectToPatch, 'User_foo')
    expect(patched.owners[0]).toEqual(projectToPatch.owners[0])
  })

  test('failing to patch a document because it is not in the db', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve(null)
    return expect(projectRepository.patch(project._id, projectToPatch)).rejects.toThrow(
      ValidationError
    )
  })

  test('failing to patch a document should throw', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve({ ...project })
    const errorObj = new Error('database derp')
    projectRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )
    return expect(projectRepository.patch(project._id, projectToPatch)).rejects.toThrow(Error)
  })

  test('failing to patch a document with access control', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve({ ...project })
    const errorObj = { forbidden: 'x' }
    projectRepository.validate = jest.fn().mockImplementationOnce(() => {
      throw errorObj
    })
    return expect(projectRepository.patch(project._id, projectToPatch, 'User_foo')).rejects.toThrow(
      Error
    )
  })

  test('failing to patch a document with access control 1', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    const errorObj = { name: 'SyncError' }
    projectRepository.getById = async (_id: string, _userId: string) => {
      throw errorObj
    }
    return expect(projectRepository.patch(project._id, projectToPatch, 'User_foo')).rejects.toThrow(
      Error
    )
  })
})

describe('SGRepository - patchSafe', () => {
  const citation = {
    _id: 'foo',
    containingObject: 'foo',
    objectType: 'MPCitation',
  }

  const citationToPatch = {
    _id: 'foo',
    containingObject: 'bar',
  }

  test('should safe patch the document', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve({ ...citation })
    projectRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.resolve()
    )

    const patched = await projectRepository.patchSafe(citation._id, citationToPatch)
    expect(patched.containingObject).toEqual(citationToPatch.containingObject)
  })

  test('should safe patch the document with access control', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve({ ...citation })
    projectRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.resolve()
    )
    projectRepository.validate = jest.fn().mockResolvedValue(true)

    const patched = await projectRepository.patchSafe(citation._id, citationToPatch, 'User_foo')
    expect(patched.containingObject).toEqual(citationToPatch.containingObject)
  })

  test('failing to safe patch a document because it is not in the db', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve(null)
    return expect(projectRepository.patchSafe(citation._id, citationToPatch)).rejects.toThrow(
      ValidationError
    )
  })

  test('failing to safe patch a document should throw', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve({ ...citation })
    const errorObj = new Error('database derp')
    projectRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )
    return expect(projectRepository.patchSafe(citation._id, citationToPatch)).rejects.toThrow(Error)
  })

  test('failing to safe patch a document with access control', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve({ ...citation })
    return expect(
      projectRepository.patchSafe(citation._id, citationToPatch, 'User_foo')
    ).rejects.toThrow(Error)
  })

  test('failing to safe patch a document with access control 1', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    const errorObj = { name: 'SyncError' }
    projectRepository.getById = async (_id: string, _userId: string) => {
      throw errorObj
    }
    return expect(
      projectRepository.patchSafe(citation._id, citationToPatch, 'User_foo')
    ).rejects.toThrow(Error)
  })
})

describe('SGRepository - purge', () => {
  const project = {
    _id: 'foo',
    owners: [],
  }

  test('should purge the document using Id', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository

    const removed = await projectRepository.purge(project._id)
    expect(removed).toEqual(undefined)
  })

  test('should throw sync error when fail to purge a document', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    const errorObj = new Error('database derp')
    projectRepository.database.bucket.remove.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )
    return expect(projectRepository.purge(project._id)).rejects.toThrow(Error)
  })
})

describe('SGRepository - bulkDocs', () => {
  const docUpdate = {
    _id: 'MPProject:abc',
    title: 'foo',
    owners: [],
    writers: [],
    viewers: [],
  }

  test('should POST _bulk_docs', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.database.bucket.upsert.mockImplementationOnce((_document: any) =>
      Promise.resolve(docUpdate)
    )
    const updated = await projectRepository.bulkUpsert([docUpdate])
    expect(updated.length).toBeGreaterThan(0)
  })

  test('should POST _bulk_docs with access control', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.database.bucket.upsert.mockImplementationOnce((_document: any) =>
      Promise.resolve(docUpdate)
    )
    projectRepository.validate = jest.fn().mockResolvedValue(true)
    const updated = await projectRepository.bulkUpsert([docUpdate], 'User_foo')
    expect(updated.length).toBeGreaterThan(0)
  })

  test('should throw sync error when fail to bulkDocs', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    const errorObj = new Error('database derp')
    projectRepository.database.bucket.insert.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )
    return expect(projectRepository.bulkUpsert([docUpdate])).rejects.toThrow(Error)
  })
})

describe('SGRepository - getExpired', () => {
  const doc = {
    _id: 'MPProject:abc',
    title: 'foo',
    owners: [],
    writers: [],
    viewers: [],
  }
  test('Get expired documents', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.buildModel = jest.fn(() => doc)
    projectRepository.database.bucket.query.mockImplementationOnce(() => Promise.resolve([doc]))
    return expect(projectRepository.getExpired()).resolves.toBeTruthy()
  })
})
