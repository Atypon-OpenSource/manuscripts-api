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
import { config } from '../../../../src/Config/Config'
import { ValidationError } from '../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'
import { ContainerInvitationLike } from 'src/DataAccess/Interfaces/Models'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe('SGRepository - create', () => {
  const project = {
    _id: 'MPProject:foo',
    owners: [],
  }

  test('should create a document', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.database.bucket.insert.mockImplementationOnce((_document: any) =>
      Promise.resolve(project)
    )
    const created = await projectRepository.create(project, {})
    expect(created._id).toEqual('MPProject:foo')
  })

  test('should fail to create a document', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    const errorObj = new Error('database derp')
    projectRepository.database.bucket.insert.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )
    return expect(projectRepository.create(project, {})).rejects.toThrowError(Error)
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

    return expect(projectRepository.getById(project._id)).rejects.toThrowError(Error)
  })
})

describe('SGRepository - update', () => {
  const invitation: ContainerInvitationLike = {
    _id: 'foo',
    invitedUserEmail: 'foo@bar.com',
    invitingUserProfile: {
      _id: 'MPUserProfile:foo@bar.com',
      userID: 'User_foo@bar.com',
      objectType: 'MPUserProfile',
      bibliographicName: {
        _id: 'MPBibliographicName:valid-bibliographic-name',
        objectType: 'MPBibliographicName',
        given: 'Kavin',
      },
      createdAt: 123,
      updatedAt: 123,
    },
    containerID: 'MPProject:projectId',
    role: 'Viewer',
    invitingUserID: 'User|id',
    objectType: 'MPContainerInvitation',
    _rev: 'rev1',
    _revisions: {
      ids: ['rev1'],
    },
  }

  test('should update the document', async () => {
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation, _rev: 'rev1' })
    containerInvitationRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.resolve()
    )

    const updated = await containerInvitationRepository.update(invitation._id, invitation, {})
    expect(updated._id).toEqual('MPContainerInvitation:foo')
  })

  test('failing to update a document should throw', () => {
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation, _rev: 'rev1' })
    const errorObj = new Error('database derp')
    containerInvitationRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )

    return expect(
      containerInvitationRepository.update(invitation._id, invitation, {})
    ).rejects.toThrowError(Error)
  })

  test('failing to update a document because it is not in the db', () => {
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) => Promise.resolve(null)

    return expect(
      containerInvitationRepository.update(invitation._id, invitation, {})
    ).rejects.toThrowError(ValidationError)
  })

  test('failing to update a document because objectType mismatched', () => {
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({
        ...invitation,
        _rev: 'rev1',
        objectType: 'Not Project',
      })

    return expect(
      containerInvitationRepository.update(invitation._id, invitation, {})
    ).rejects.toThrowError(ValidationError)
  })
})

describe('SGRepository - patch', () => {
  const project = {
    _id: 'foo',
    owners: [],
    objectType: 'MPProject',
    _rev: 'rev1',
    _revisions: {
      ids: ['rev1'],
    },
  }

  const projectToPatch = {
    _id: 'foo',
    owners: ['User_test'],
  }

  test('should patch the document', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve({ ...project, _rev: 'rev1' })
    projectRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.resolve()
    )

    const patched = await projectRepository.patch(project._id, projectToPatch, {})
    expect(patched.owners[0]).toEqual(projectToPatch.owners[0])
  })

  test('failing to patch a document because it is not in the db', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve(null)
    return expect(projectRepository.patch(project._id, projectToPatch, {})).rejects.toThrowError(
      ValidationError
    )
  })

  test('failing to patch a document should throw', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve({ ...project, _rev: 'rev1' })
    const errorObj = new Error('database derp')
    projectRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )
    return expect(projectRepository.patch(project._id, projectToPatch, {})).rejects.toThrowError(
      Error
    )
  })
})

describe('SGRepository - touch', () => {
  const invitation = {
    _id: 'MPInvitation:valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com',
    invitingUserID: 'User_valid-user@manuscriptsapp.com',
    invitedUserEmail: 'valid-google@manuscriptsapp.com',
    message: 'Message',
    createdAt: 1522231220,
    objectType: 'MPInvitation',
    _rev: 'rev1',
    _revisions: {
      ids: ['rev1'],
    },
  }

  test('should touch the document', async () => {
    const invitationRepository: any = DIContainer.sharedContainer.invitationRepository
    invitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation, _rev: 'rev1' })
    invitationRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.resolve()
    )

    const touched = await invitationRepository.touch(invitation._id, 1)
    expect(touched.expiry).toEqual(1)
  })

  test('failing to touch a document because it is not in the db', () => {
    const invitationRepository: any = DIContainer.sharedContainer.invitationRepository
    invitationRepository.getById = async (_id: string) => Promise.resolve(null)
    return expect(
      invitationRepository.touch(
        'MPInvitation:valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com',
        1
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('failing to touch a document should throw', () => {
    const invitationRepository: any = DIContainer.sharedContainer.invitationRepository
    invitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation, _rev: 'rev1' })
    const errorObj = new Error('database derp')
    invitationRepository.database.bucket.replace.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )
    return expect(invitationRepository.touch(invitation._id, 1)).rejects.toThrowError(Error)
  })
})

describe('SGRepository - remove', () => {
  const invitation: ContainerInvitationLike = {
    _id: 'foo',
    invitedUserEmail: 'foo@bar.com',
    invitingUserProfile: {
      _id: 'MPUserProfile:foo@bar.com',
      userID: 'User_foo@bar.com',
      objectType: 'MPUserProfile',
      bibliographicName: {
        _id: 'MPBibliographicName:valid-bibliographic-name',
        objectType: 'MPBibliographicName',
        given: 'Kavin',
      },
      createdAt: 123,
      updatedAt: 123,
    },
    containerID: 'MPProject:projectId',
    role: 'Viewer',
    invitingUserID: 'User|id',
    objectType: 'MPContainerInvitation',
  }

  test('should mark the document as deleted', async () => {
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation })

    const removed = await containerInvitationRepository.remove(invitation._id)
    expect(removed).toEqual(undefined)
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
    return expect(projectRepository.purge(project._id)).rejects.toThrowError(Error)
  })
})

describe('SGRepository - bulkDocs', () => {
  const docUpdate = {
    _id: 'MPProject:abc',
    title: 'foo',
  }

  test('should POST _bulk_docs', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    projectRepository.database.bucket.upsert.mockImplementationOnce((_document: any) =>
      Promise.resolve(docUpdate)
    )
    const updated = await projectRepository.bulkDocs([docUpdate])
    expect(updated.length).toBeGreaterThan(0)
  })

  test('should throw sync error when fail to bulkDocs', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    const errorObj = new Error('database derp')
    projectRepository.database.bucket.upsert.mockImplementationOnce((_document: any) =>
      Promise.reject(errorObj)
    )
    return expect(projectRepository.bulkDocs([docUpdate])).rejects.toThrowError(Error)
  })

  test.skip('should throw response with error messages when they are available', () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    return expect(projectRepository.bulkDocs([docUpdate])).rejects.toThrow(/forbidden/)
  })
})
