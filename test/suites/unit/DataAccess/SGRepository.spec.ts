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

jest.mock('request-promise-native')

const request = require('request-promise-native')

import { DIContainer } from '../../../../src/DIContainer/DIContainer'
import { config } from '../../../../src/Config/Config'
import {
  SyncError,
  ValidationError,
  GatewayInaccessibleError
} from '../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'
import { ContainerInvitationLike } from 'src/DataAccess/Interfaces/Models'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

xdescribe('SGRepository - create', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200 }))
  })

  const project = {
    _id: 'foo',
    owners: []
  }

  test('should create a document', async () => {
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository

    await projectRepository.create(project, {})
    const payload = request.mock.calls[0][0]
    project._id = `MPProject:${project._id}`;

    (project as any).objectType = `MPProject`;
    (project as any).createdAt = 123456789;
    (project as any).updatedAt = 123456789

    payload.body.createdAt = 123456789
    payload.body.updatedAt = 123456789

    expect(payload).toEqual({
      json: true,
      method: 'PUT',
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${
        config.gateway.ports.admin
      }/bkt/${project._id}`,
      body: project,
      simple: false
    })
  })

  test('should fail to create a document', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    return expect(projectRepository.create(project, {})).rejects.toThrowError(
      SyncError
    )
  })

  test('should fail to create a document when sync_gateway inAccessible', () => {
    request.mockImplementation(() =>
      Promise.reject(new GatewayInaccessibleError('Fake induced fail.'))
    )
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    return expect(projectRepository.create(project, {})).rejects.toThrowError(
      GatewayInaccessibleError
    )
  })
})

xdescribe('SGRepository - getById', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200 }))
  })

  const project = {
    _id: 'foo',
    owners: []
  }

  test('should get the document by Id', async () => {
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository

    await projectRepository.getById(project._id)
    const payload = request.mock.calls[0][0]

    expect(payload).toEqual({
      json: true,
      method: 'GET',
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${
        config.gateway.ports.admin
      }/bkt/MPProject:foo`,
      simple: false
    })
  })

  test('should return null if the document not exist', async () => {
    request.mockImplementation(() => ({ statusCode: 404 }))
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    const projectReturn = await projectRepository.getById(project._id)
    return expect(projectReturn).toBeNull()
  })

  test('failing to get a document should throw', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    return expect(projectRepository.getById(project._id)).rejects.toThrowError(
      SyncError
    )
  })

  test('failing to get a document when sync_gateway inAccessible', () => {
    request.mockImplementation(() =>
      Promise.reject(new GatewayInaccessibleError('Fake induced fail.'))
    )
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    return expect(projectRepository.getById(project._id)).rejects.toThrowError(
      GatewayInaccessibleError
    )
  })
})

xdescribe('SGRepository - update', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200 }))
  })

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
        given: 'Kavin'
      },
      createdAt: 123,
      updatedAt: 123
    },
    containerID: 'MPProject:projectId',
    role: 'Viewer',
    invitingUserID: 'User|id',
    objectType: 'MPContainerInvitation'
  }

  test('should update the document', async () => {
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation, _rev: 'rev1' })

    await containerInvitationRepository.update(invitation._id, invitation, {})
    const payload = request.mock.calls[0][0];

    (invitation as any).updatedAt = 123456789
    payload.body.updatedAt = 123456789

    expect(payload).toEqual({
      json: true,
      method: 'PUT',
      body: invitation,
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${
        config.gateway.ports.admin
      }/bkt/MPContainerInvitation:foo?rev=rev1`
    })
  })

  test('failing to update a document should throw', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation, _rev: 'rev1' })

    return expect(
      containerInvitationRepository.update(invitation._id, invitation, {})
    ).rejects.toThrowError(SyncError)
  })

  test('failing to update a document because it is not in the db', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve(null)

    return expect(
      containerInvitationRepository.update(invitation._id, invitation, {})
    ).rejects.toThrowError(ValidationError)
  })

  test('failing to update a document because objectType mismatched', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({
        ...invitation,
        _rev: 'rev1',
        objectType: 'Not Project'
      })

    return expect(
      containerInvitationRepository.update(invitation._id, invitation, {})
    ).rejects.toThrowError(ValidationError)
  })

  test('failing to update a document when sync_gateway inAccessible', () => {
    request.mockImplementation(() =>
      Promise.reject(new GatewayInaccessibleError('Fake induced fail.'))
    )
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation, _rev: 'rev1' })

    return expect(
      containerInvitationRepository.update(invitation._id, invitation, {})
    ).rejects.toThrowError(GatewayInaccessibleError)
  })
})

xdescribe('SGRepository - patch', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200 }))
  })

  const project = {
    _id: 'foo',
    owners: [],
    objectType: 'MPProject'
  }

  const projectToPatch = {
    _id: 'foo',
    owners: ['User_test']
  }

  test('should patch the document', async () => {
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) =>
      Promise.resolve({ ...project, _rev: 'rev1' })

    await projectRepository.patch(project._id, projectToPatch, {})
    const payload = request.mock.calls[0][0]
    payload.body.updatedAt = 123456789

    expect(payload).toEqual({
      json: true,
      method: 'PUT',
      body: {
        ...projectToPatch,
        objectType: 'MPProject',
        _rev: 'rev1',
        updatedAt: 123456789
      },
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${
        config.gateway.ports.admin
      }/bkt/MPProject:foo?rev=rev1`
    })
  })

  test('failing to patch a document because it is not in the db', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) => Promise.resolve(null)
    return expect(
      projectRepository.patch(project._id, projectToPatch, {})
    ).rejects.toThrowError(ValidationError)
  })

  test('failing to patch a document should throw', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) =>
      Promise.resolve({ ...project, _rev: 'rev1' })
    return expect(
      projectRepository.patch(project._id, projectToPatch, {})
    ).rejects.toThrowError(SyncError)
  })

  test('failing to patch a document when sync_gateway inAccessible', () => {
    request.mockImplementation(() =>
      Promise.reject(new GatewayInaccessibleError('Fake induced fail.'))
    )
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    projectRepository.getById = async (_id: string) =>
      Promise.resolve({ ...project, _rev: 'rev1' })
    return expect(
      projectRepository.patch(project._id, projectToPatch, {})
    ).rejects.toThrowError(GatewayInaccessibleError)
  })
})

xdescribe('SGRepository - touch', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200 }))
  })

  const invitation = {
    _id:
      'MPInvitation:valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com',
    invitingUserID: 'User_valid-user@manuscriptsapp.com',
    invitedUserEmail: 'valid-google@manuscriptsapp.com',
    message: 'Message',
    createdAt: 1522231220,
    objectType: 'MPInvitation'
  }

  test('should touch the document', async () => {
    const invitationRepository: any =
      DIContainer.sharedContainer.invitationRepository
    invitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation, _rev: 'rev1' })

    await invitationRepository.touch(invitation._id, 1)
    const payload = request.mock.calls[0][0]

    expect(payload).toEqual({
      json: true,
      method: 'PUT',
      body: {
        ...invitation,
        objectType: 'MPInvitation',
        _rev: 'rev1',
        _exp: 1
      },
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${
        config.gateway.ports.admin
      }/bkt/MPInvitation:valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com`
    })
  })

  test('failing to touch a document because it is not in the db', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const invitationRepository: any =
      DIContainer.sharedContainer.invitationRepository
    invitationRepository.getById = async (_id: string) => Promise.resolve(null)
    return expect(
      invitationRepository.touch(
        'MPInvitation:valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com',
        1
      )
    ).rejects.toThrowError(ValidationError)
  })

  test('failing to touch a document should throw', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    const invitationRepository: any =
      DIContainer.sharedContainer.invitationRepository
    invitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation, _rev: 'rev1' })
    return expect(
      invitationRepository.touch(invitation._id, 1)
    ).rejects.toThrowError(SyncError)
  })

  test('failing to touch a document when sync_gateway inAccessible', () => {
    request.mockImplementation(() =>
      Promise.reject(new GatewayInaccessibleError('Fake induced fail.'))
    )
    const invitationRepository: any =
      DIContainer.sharedContainer.invitationRepository
    invitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation, _rev: 'rev1' })
    return expect(
      invitationRepository.touch(invitation._id, 1)
    ).rejects.toThrowError(GatewayInaccessibleError)
  })
})

xdescribe('SGRepository - remove', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200 }))
  })

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
        given: 'Kavin'
      },
      createdAt: 123,
      updatedAt: 123
    },
    containerID: 'MPProject:projectId',
    role: 'Viewer',
    invitingUserID: 'User|id',
    objectType: 'MPContainerInvitation'
  }

  test('should mark the document as deleted', async () => {
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation })

    await containerInvitationRepository.remove(invitation._id)
    const payload = request.mock.calls[0][0]

    const body = {
      docs: [
        {
          ...invitation,
          _deleted: true
        }
      ]
    }
    expect(payload).toEqual({
      json: true,
      method: 'POST',
      body: body,
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${
        config.gateway.ports.admin
      }/bkt/_bulk_docs`,
      simple: false
    })
  })

  test('failing to mark a document as deleted when sync_gateway inAccessible', () => {
    request.mockImplementation(() =>
      Promise.reject(new GatewayInaccessibleError('Fake induced fail.'))
    )
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation })

    return expect(
      containerInvitationRepository.remove(invitation._id)
    ).rejects.toThrowError(GatewayInaccessibleError)
  })
})

xdescribe('SGRepository - purge', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200 }))
  })

  const project = {
    _id: 'foo',
    owners: []
  }

  test('should purge the document using Id', async () => {
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository

    await projectRepository.purge(project._id)
    const payload = request.mock.calls[0][0]

    expect(payload).toEqual({
      json: true,
      method: 'POST',
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${
        config.gateway.ports.admin
      }/bkt/_purge`,
      simple: false,
      body: { 'MPProject:foo': ['*'] }
    })
  })

  test('should fail to purge a document when sync_gateway inAccessible', () => {
    request.mockImplementation(() =>
      Promise.reject(new GatewayInaccessibleError('Fake induced fail.'))
    )
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    return expect(projectRepository.purge(project._id)).rejects.toThrowError(
      GatewayInaccessibleError
    )
  })

  test('should throw sync error when fail to purge a document', () => {
    request.mockImplementation(() => ({ statusCode: 404 }))
    const projectRepository: any =
      DIContainer.sharedContainer.projectRepository
    return expect(projectRepository.purge(project._id)).rejects.toThrowError(
      SyncError
    )
  })
})

xdescribe('SGRepository - bulkDocs', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200, body: [{ }] }))
  })

  const docUpdate = {
    _id: 'MPProject:abc',
    title: 'foo'
  }

  test('should POST _bulk_docs', async () => {
    const projectRepository: any = DIContainer.sharedContainer.projectRepository

    await projectRepository.bulkDocs([ docUpdate ])
    const payload = request.mock.calls[0][0]

    expect(payload.uri).toEqual(`http://${config.gateway.hostname}:${config.gateway.ports.admin}/bkt/_bulk_docs`)
    expect(payload.body.docs.length).toBeGreaterThan(0)
  })

  test('should fail to bulkDocs when sync_gateway inAccessible', () => {
    request.mockImplementation(() => Promise.reject(new GatewayInaccessibleError('Fake induced fail.')))
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    return expect(projectRepository.bulkDocs([ docUpdate ])).rejects.toThrowError(GatewayInaccessibleError)
  })

  test('should throw sync error when fail to bulkDocs', () => {
    request.mockImplementation(() => ({ statusCode: 404 }))
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    return expect(projectRepository.bulkDocs([ docUpdate ])).rejects.toThrowError(SyncError)
  })

  test('should throw response with error messages when they are available', () => {
    request.mockImplementation(() => ({ statusCode: 200, body: [{ error: 'forbidden' }] }))
    const projectRepository: any = DIContainer.sharedContainer.projectRepository
    return expect(projectRepository.bulkDocs([ docUpdate ])).rejects.toThrow(/forbidden/)
  })
})

xdescribe('SGRepository - removeByUserIdAndEmail', () => {
  beforeEach(() => {
    request.mockClear()
    request.mockImplementation(() => ({ statusCode: 200, body: { results: [invitation] } }))
  })

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
        given: 'Kavin'
      },
      createdAt: 123,
      updatedAt: 123
    },
    containerID: 'MPProject:projectId',
    role: 'Viewer',
    invitingUserID: 'User_id',
    objectType: 'MPContainerInvitation'
  }

  test('should purge user invitations', async () => {
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository

    containerInvitationRepository.getById = async (_id: string) =>
      Promise.resolve({ ...invitation })

    containerInvitationRepository.purge = jest.fn()
    await containerInvitationRepository.removeByUserIdAndEmail(
      'User|id',
      'foo@bar.baz'
    )
    const payload = request.mock.calls[0][0]

    expect(payload).toEqual({
      json: true,
      method: 'GET',
      resolveWithFullResponse: true,
      uri: `http://${config.gateway.hostname}:${
        config.gateway.ports.admin
      }/bkt/_changes?filter=sync_gateway/bychannel&channels=User_id`,
      simple: false
    })
  })

  test('should fail to purge invitations when sync_gateway inAccessible', () => {
    request.mockImplementation(() =>
      Promise.reject(new GatewayInaccessibleError('Fake induced fail.'))
    )
    const containerInvitationRepository: any =
      DIContainer.sharedContainer.containerInvitationRepository
    return expect(
      containerInvitationRepository.removeByUserIdAndEmail(
        'User|id',
        'foo@bar.baz'
      )
    ).rejects.toThrowError(GatewayInaccessibleError)
  })
})
