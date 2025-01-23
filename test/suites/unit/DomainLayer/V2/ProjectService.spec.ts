/*!
 * © 2023 Atypon Systems LLC
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
import '../../../../utilities/configMock.ts'
import '../../../../utilities/dbMock.ts'

import { ObjectTypes } from '@manuscripts/json-schema'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { ConfigService } from '../../../../../src/DomainServices/ConfigService'
import { ProjectService } from '../../../../../src/DomainServices/ProjectService'
import {
  MissingContainerError,
  MissingTemplateError,
  RecordNotFoundError,
  UserRoleError,
  ValidationError,
} from '../../../../../src/Errors'
import { ProjectPermission, ProjectUserRole } from '../../../../../src/Models/ProjectModels'
import { ProjectClient, UserClient } from '../../../../../src/Models/RepositoryModels'
import { templates } from '../../../../data/dump/templates'
import { validManuscript, validManuscript1 } from '../../../../data/fixtures/manuscripts'
import {
  validProject,
  validProject2,
  validProject4,
  validProject8,
} from '../../../../data/fixtures/projects'
import { validUser2 } from '../../../../data/fixtures/UserRepository'
import { validUser } from '../../../../data/fixtures/userServiceUser'
import { readAndParseFixture } from '../../../../utilities/files'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

//todo revisit these tests, cleanup & more precise tests needed

jest.setTimeout(TEST_TIMEOUT)

let projectService: ProjectService

let projectClient: ProjectClient
let configService: ConfigService
let userClient: UserClient
beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
  projectService = DIContainer.sharedContainer.projectService
  projectClient = DIContainer.sharedContainer.projectClient
  configService = DIContainer.sharedContainer.configService
  userClient = DIContainer.sharedContainer.userClient
})
afterEach(() => {
  jest.clearAllMocks()
})
const JSZip = require('jszip')

describe('projectService', () => {
  const projectID = validProject._id
  const manuscriptID = validManuscript._id
  const userID = validUser.id
  const templateID = templates[0]._id
  describe('createProject', () => {
    it('should create a new project without ID and title', async () => {
      projectClient.createProject = jest.fn().mockResolvedValue({})
      await expect(projectService.createProject(userID)).resolves.not.toThrow()
      expect(projectClient.createProject).toHaveBeenCalled()
    })
  })
  describe('createManuscript', () => {
    it('should create a new manuscript', async () => {
      projectClient.createManuscript = jest.fn().mockResolvedValue({})
      projectService['createManuscriptDoc'] = jest.fn()

      await projectService.createManuscript(projectID)

      expect(projectClient.createManuscript).toHaveBeenCalled()
    })
    it('should create a new manuscript with the provided templateID', async () => {
      const expectedManuscript = {
        objectType: ObjectTypes.Manuscript,
        containerID: projectID,
        prototype: templateID,
      }

      configService.hasDocument = jest.fn().mockResolvedValue(true)
      projectClient.createManuscript = jest.fn().mockResolvedValue(expectedManuscript)
      projectService['createManuscriptDoc'] = jest.fn()

      const result = await projectService.createManuscript(projectID, templateID)

      expect(result).toEqual(expectedManuscript)
      expect(configService.hasDocument).toHaveBeenCalledWith(templateID)
      expect(projectClient.createManuscript).toHaveBeenCalledWith(projectID, templateID)
    })

    it('should throw an error if the provided templateID does not exist', async () => {
      configService.hasDocument = jest.fn().mockResolvedValue(false)
      projectClient.createManuscript = jest.fn().mockResolvedValue(null)
      projectService['createManuscriptDoc'] = jest.fn()
      await expect(projectService.createManuscript(projectID, templateID)).rejects.toThrow(
        new MissingTemplateError(templateID)
      )
      expect(configService.hasDocument).toHaveBeenCalledWith(templateID)
      expect(projectClient.createManuscript).not.toHaveBeenCalled()
    })
  })

  describe('importJats', () => {
    it('should throw an error if the provided templateID does not exist', async () => {
      const file = {}
      configService.getDocument = jest.fn().mockResolvedValue(undefined)
      await expect(
        // @ts-ignore
        projectService.importJats(validUser.id, file, projectID, templateID)
      ).rejects.toThrow(new MissingTemplateError(templateID))
      expect(configService.getDocument).toHaveBeenCalledWith(templateID)
    })

    it('should succeed if called correctly', async () => {
      const file = {}
      const docClient = DIContainer.sharedContainer.documentClient
      const jats = await readAndParseFixture('jats-sample.xml')
      configService.getDocument = jest.fn().mockResolvedValue(JSON.stringify(templates[0]))
      //@ts-ignore
      projectClient.bulkInsert = jest.fn(async () => Promise.resolve())
      // @ts-ignore
      projectService.convert = jest.fn(() => Promise.resolve(jats))
      // @ts-ignore
      docClient.createDocument = jest.fn(async () => Promise.resolve())
      // @ts-ignore
      const output = await projectService.importJats(validUser.id, file, projectID, templateID)
      expect(output.containerID).toEqual(projectID)
      expect(output.prototype).toEqual(templateID)
      expect(output.updatedAt).not.toBeNull()
      expect(output.createdAt).not.toBeNull()
    })
  })

  describe('getProject', () => {
    it('should throw an error if the project does not exist', async () => {
      projectClient.getProject = jest.fn().mockResolvedValue(null)
      await expect(projectService.getProject(projectID)).rejects.toThrow(
        new MissingContainerError(projectID)
      )
    })
    it('should return a project if the project exists', async () => {
      projectClient.getProject = jest.fn().mockResolvedValue(validProject)
      const project = await projectService.getProject(projectID)
      expect(project).toEqual(validProject)
    })
  })

  describe('updateProject', () => {
    it('should throw an error if invalid containerID', async () => {
      const models = [
        {
          containerID: validProject2._id,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        new ValidationError('problem with containerID', models)
      )
    })
    it('should throw an error if data contains multiple manuscriptIDs', async () => {
      const models = [
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: projectID,
          manuscriptID: validManuscript1._id,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        new ValidationError('contains multiple manuscriptIDs', models)
      )
    })
    it('should throw an error if manuscript does not exist', async () => {
      const models = [
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      projectClient.getProject = jest.fn().mockResolvedValue(null)
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        new ValidationError("manuscript doesn't exist", models)
      )
    })
    it('should throw an error if manuscript does not belong to project', async () => {
      const models = [
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
        {
          containerID: projectID,
          manuscriptID: manuscriptID,
          objectType: ObjectTypes.Project,
          createdAt: 20,
          updatedAt: 21,
        },
      ]
      projectClient.getProject = jest.fn().mockResolvedValue({ containerID: manuscriptID })
      // @ts-ignore
      await expect(projectService.updateProject(projectID, models)).rejects.toThrow(
        new ValidationError("manuscript doesn't belong to project", models)
      )
    })
    it('should update project if manuscript belongs to project, manuscript exists, no multiple manuscriptIDs and a valid containerID', async () => {
      const manuscript = {
        _id: 'MPManuscript:test-manuscript',
        objectType: ObjectTypes.Manuscript,
        containerID: projectID,
        createdAt: 20,
      }
      const paragraph = {
        _id: 'MPParagraphElement:test-paragraph',
        objectType: ObjectTypes.ParagraphElement,
        contents: 'Test paragraph',
        elementType: 'p',
        containerID: projectID,
        manuscriptID: manuscriptID,
        createdAt: 20,
      }
      const models = [manuscript, paragraph]
      projectClient.getProject = jest.fn().mockResolvedValue({ containerID: projectID })
      projectClient.removeWithAllResources = jest.fn()
      projectClient.removeAll = jest.fn()
      projectClient.bulkInsert = jest.fn()
      await expect(projectService.updateProject(projectID, models as any)).resolves.not.toThrow()
    })
  })
  describe('revokeRole', () => {
    it('should throw an error if invalid userID', async () => {
      projectService.getProject = jest.fn().mockResolvedValue(validProject)
      userClient.findByConnectID = jest.fn().mockResolvedValue(null)
      await expect(projectService.revokeRoles(projectID, userID)).rejects.toThrow(
        new ValidationError('Invalid user id', null)
      )
    })
    it('should throw an error if user is the only Owner', async () => {
      const project = {
        owners: [userID],
        writers: [],
        viewers: [],
        editors: [],
        annotators: [],
      }
      projectService.getProject = jest.fn().mockResolvedValue(project)
      userClient.findByConnectID = jest.fn().mockResolvedValue(validUser)
      await expect(projectService.revokeRoles(projectID, userID)).rejects.toThrow(
        new UserRoleError('User is the only owner', ProjectUserRole.Owner)
      )
    })
    it('should revoke user role successfully', async () => {
      const project = {
        owners: [userID, validUser2._id],
        writers: [],
        viewers: [],
        editors: [],
        annotators: [],
      }
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const user = { id: userID }
      userClient.findByConnectID = jest.fn().mockResolvedValue(user)
      projectClient.patch = jest.fn().mockResolvedValue({})

      await projectService.revokeRoles(projectID, userID)

      expect(projectService.getProject).toHaveBeenCalledTimes(1)
      expect(projectService.getProject).toHaveBeenCalledWith(projectID)

      expect(userClient.findByConnectID).toHaveBeenCalledTimes(1)
      expect(userClient.findByConnectID).toHaveBeenCalledWith(userID)

      expect(projectClient.patch).toHaveBeenCalledTimes(1)

      expect(projectClient.patch).toHaveBeenCalledWith(projectID, {
        _id: projectID,
        owners: [validUser2._id],
        writers: [],
        viewers: [],
        editors: [],
        annotators: [],
        proofers: [],
      })
    })
  })
  describe('updateUserRole', () => {
    it('should throw an error if invalid userID', async () => {
      projectService.getProject = jest.fn().mockResolvedValue(validProject)
      userClient.findByConnectID = jest.fn().mockResolvedValue(null)
      await expect(
        projectService.updateUserRole(projectID, userID, ProjectUserRole.Writer)
      ).rejects.toThrow(new ValidationError('Invalid user id', null))
    })
    it('should throw an error if user is the only Owner', async () => {
      const project = {
        owners: [userID],
        writers: [],
        viewers: [],
        editors: [],
        annotators: [],
      }
      projectService.getProject = jest.fn().mockResolvedValue(project)
      userClient.findByConnectID = jest.fn().mockResolvedValue(validUser)
      await expect(
        projectService.updateUserRole(projectID, userID, ProjectUserRole.Owner)
      ).rejects.toThrow(new UserRoleError('User is the only owner', ProjectUserRole.Owner))
    })
    it('should update user role successfully', async () => {
      const project = {
        owners: [userID, validUser2._id],
        writers: [],
        viewers: [],
        editors: [],
        annotators: [],
      }
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const user = { id: userID }
      userClient.findByConnectID = jest.fn().mockResolvedValue(user)
      projectClient.patch = jest.fn().mockResolvedValue({})

      await projectService.updateUserRole(projectID, userID, ProjectUserRole.Writer)

      expect(projectService.getProject).toHaveBeenCalledTimes(1)
      expect(projectService.getProject).toHaveBeenCalledWith(projectID)

      expect(userClient.findByConnectID).toHaveBeenCalledTimes(1)
      expect(userClient.findByConnectID).toHaveBeenCalledWith(userID)

      expect(projectClient.patch).toHaveBeenCalledTimes(1)

      expect(projectClient.patch).toHaveBeenCalledWith(projectID, {
        _id: projectID,
        owners: [validUser2._id],
        writers: [userID],
        viewers: [],
        editors: [],
        annotators: [],
        proofers: [],
      })
    })
  })
  describe('getPermissions', () => {
    it('should return all permissions when user is owner', async () => {
      const project = validProject
      project.owners = [userID]
      project.viewers = []
      project.writers = []
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(
        new Set([
          ProjectPermission.READ,
          ProjectPermission.UPDATE,
          ProjectPermission.DELETE,
          ProjectPermission.UPDATE_ROLES,
          ProjectPermission.CREATE_MANUSCRIPT,
        ])
      )
    })
    it('should return READ permission for non-owner viewers', async () => {
      const project = validProject
      project.owners = []
      project.viewers = [userID]
      project.writers = []
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set([ProjectPermission.READ]))
    })
    it('should return READ, UPDATE, and CREATE_MANUSCRIPT permissions for non-owner writers', async () => {
      const project = validProject
      project.owners = []
      project.viewers = []
      project.writers = [userID]
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(
        new Set([
          ProjectPermission.READ,
          ProjectPermission.UPDATE,
          ProjectPermission.CREATE_MANUSCRIPT,
        ])
      )
    })
    it('should give READ and UPDATE permissions for project editors', async () => {
      const project = validProject
      project.owners = []
      project.viewers = []
      project.writers = []
      project.editors = [userID]
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set([ProjectPermission.READ, ProjectPermission.UPDATE]))
    })
    it('should give READ and UPDATE permissions for project annotators', async () => {
      const project = validProject
      project.owners = []
      project.viewers = []
      project.writers = []
      project.annotators = [userID]
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set([ProjectPermission.READ, ProjectPermission.UPDATE]))
    })
    it('should return empty permissions for users who are not owners, writers, or viewers, and the project has no annotators or editors', async () => {
      const project = validProject
      project.owners = []
      project.viewers = []
      project.writers = []
      project.annotators = []
      project.editors = []
      projectService.getProject = jest.fn().mockResolvedValue(project)
      const permissions = await projectService.getPermissions(projectID, userID)
      expect(permissions).toEqual(new Set<ProjectPermission>())
    })
  })
  describe('makeArchive', () => {
    it('should generate an archive with index.manuscript-json file', async () => {
      projectClient.getProjectResources = jest.fn().mockResolvedValue(validProject)
      const result = await projectService.makeArchive(projectID, {
        getAttachments: true,
        includeExt: true,
      })
      const zip = await JSZip.loadAsync(result)
      expect(Object.keys(zip.files).length).toBe(1)
      const content = await zip.files['index.manuscript-json'].async('text')
      const json = JSON.parse(content)
      expect(json.data._id).toBe(projectID)
      expect(result).toBeInstanceOf(Buffer)
    })
    it('should return only index.manuscript.json when getAttachments option is false', async () => {
      projectClient.getProjectResources = jest.fn().mockResolvedValue(validProject)
      const result = await projectService.makeArchive(projectID, {
        getAttachments: false,
        includeExt: true,
      })

      expect(result).toBeInstanceOf(Buffer)
      const expectedResult = Buffer.from(JSON.stringify({ version: '2.0', data: validProject }))
      expect(result).toEqual(expectedResult)
    })

    it('should generate an archive with only resource IDs when onlyIDs option is true', async () => {
      const resourceIDs = ['resource1', 'resource2']
      projectClient.getProjectResourcesIDs = jest.fn().mockResolvedValue(resourceIDs)

      const result = await projectService.makeArchive(projectID, {
        onlyIDs: true,
        includeExt: true,
        getAttachments: true,
      })

      const zip = await JSZip.loadAsync(result)
      const indexFile = await zip.file('index.manuscript-json').async('string')
      const index = JSON.parse(indexFile)

      expect(index.version).toBe('2.0')
      expect(index.data).toEqual(resourceIDs)
    })

    it('should return an archive with only index.manuscript-json file when no resources exist', async () => {
      const resources: any[] = []
      projectClient.getProjectResources = jest.fn().mockResolvedValue(resources)
      const result = await projectService.makeArchive(projectID, {
        getAttachments: true,
        includeExt: true,
      })
      const zip = await JSZip.loadAsync(result)
      const files = Object.keys(zip.files)

      expect(files.length).toBe(1)
      expect(files[0]).toBe('index.manuscript-json')
    })
  })

  describe('projectService - getUserRole', () => {
    test('should return owner if the user is an owner', () => {
      expect(
        projectService.getUserRole(validProject2, 'User_valid-user-1@manuscriptsapp.com')
      ).toBe(ProjectUserRole.Owner)
    })

    test('should return writer if the user is an writer', () => {
      expect(projectService.getUserRole(validProject4, 'User_test10')).toBe(ProjectUserRole.Writer)
    })

    test('should return viewer if the user is an viewer', () => {
      expect(projectService.getUserRole(validProject4, 'User_test2')).toBe(ProjectUserRole.Viewer)
    })

    test('should return editor if the user is an editor', () => {
      expect(projectService.getUserRole(validProject8, 'User_foo@bar.com')).toBe(
        ProjectUserRole.Editor
      )
    })

    test('should return annotator if the user is an annotator', () => {
      expect(projectService.getUserRole(validProject8, 'User_test2')).toBe(
        ProjectUserRole.Annotator
      )
    })

    test('should return true if user is editor', () => {
      expect(ProjectService.isEditor(validProject8 as any, 'User_foo@bar.com')).toBeTruthy()
    })

    test('should return true if user is annotator', () => {
      expect(ProjectService.isAnnotator(validProject8 as any, 'User_test2')).toBeTruthy()
    })

    test('should return null if the user is not in the project', () => {
      expect(projectService.getUserRole(validProject4, 'User_asda')).toBeNull()
    })
  })
  describe('projectService - exportJats', () => {
    const manuscript = { ...validManuscript, prototype: projectID }
    const resources = [validProject, manuscript, { objectType: 'MPJournal' }]
    jest.mock('@manuscripts/transform')
    test('should fail if manuscript document has no template', () => {
      DIContainer.sharedContainer.documentClient.findDocument = jest
        .fn()
        .mockResolvedValue({ doc: { attrs: {} } })
      projectService.getProjectModels = jest
        .fn()
        .mockResolvedValue([validProject, validManuscript, { objectType: 'MPJournal' }])
      expect(projectService.exportJats(validProject._id, validManuscript._id, false)).rejects.toThrow(
        ValidationError
      )
    })
    test('should fail if template is not found', () => {
      projectService.getProjectModels = jest.fn().mockResolvedValue(resources)
      DIContainer.sharedContainer.documentClient.findDocument = jest
        .fn()
        .mockResolvedValue({ doc: { attrs: { prototype: '123' } } })
      configService.getDocument = jest.fn().mockResolvedValue(false)
      expect(projectService.exportJats(validProject._id, validManuscript._id, false)).rejects.toThrow(
        MissingTemplateError
      )
    })
    test('should fail if styles are not found', () => {
      projectService.getProjectModels = jest.fn().mockResolvedValue(resources)
      DIContainer.sharedContainer.documentClient.findDocument = jest
        .fn()
        .mockResolvedValue({ doc: { attrs: { prototype: '123' } } })

      configService.getDocument = jest
        .fn()
        .mockResolvedValueOnce(JSON.stringify({ bundle: 'bundle-123' }))
        .mockResolvedValueOnce(JSON.stringify({ csl: { _id: 'csl-123' } }))
        .mockResolvedValueOnce(undefined)
      expect(projectService.exportJats(validProject._id, validManuscript._id, false)).rejects.toThrow(
        RecordNotFoundError
      )
    })
  })
})
