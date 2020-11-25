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

jest.mock('email-templates', () =>
  jest.fn().mockImplementation(() => {
    return {
      send: jest.fn(() => Promise.resolve({})),
      render: jest.fn(() => Promise.resolve({}))
    }
  })
)

jest.mock('../../../src/DomainServices/External/AWS', () => ({
  SES: { sendEmail: jest.fn((_foo, callback) => callback(null, { foo: 1 })) }
}))

import pRetry from 'p-retry'

import { TEST_TIMEOUT } from '../../utilities/testSetup'
import { testDatabase, drop, dropBucket } from '../../utilities/db'

import { DIContainer } from '../../../src/DIContainer/DIContainer'
import {
  validUserProfile,
  validUserProfile2
} from '../../data/fixtures/UserRepository'
import {
  validProjectForMemento,
  validProjectForSummary
} from '../../data/fixtures/projects'
import { BucketKey } from '../../../src/Config/ConfigurationTypes'

let db: any = null

beforeAll(async () => (db = await testDatabase(false, true, BucketKey.Data)))
afterAll(() => {
  db.bucket.disconnect()
})

jest.setTimeout(TEST_TIMEOUT * 2)

async function addProjectMementos (userID: string) {
  try {
    const projectMementos = await pRetry(
      async () => {
        const projectMementos = await DIContainer.sharedContainer.projectMementoRepository.getByUserId(
          userID.replace('_', '|')
        )

        if (projectMementos.length) {
          return projectMementos
        } else {
          throw new Error()
        }
      },
      { retries: 7 }
    )
    return projectMementos
  } catch (e) {
    return null
  }
}

async function addProjectSummary (projectId: string) {
  try {
    const projectSummary = await pRetry(
      async () => {
        const projectSummary = await DIContainer.sharedContainer.projectSummaryRepository.getById(
          `MPProjectSummary:${projectId}`
        )

        if (projectSummary) {
          return projectSummary
        } else {
          throw new Error()
        }
      },
      { retries: 7 }
    )
    return projectSummary
  } catch (e) {
    return null
  }
}

async function updateProjectSummary (projectId: string, updatedAt: number) {
  try {
    const projectSummary = await pRetry(
      async () => {
        const projectSummary = await DIContainer.sharedContainer.projectSummaryRepository.getById(
          `MPProjectSummary:${projectId}`
        )

        if (projectSummary.updatedAt !== updatedAt) {
          return projectSummary
        } else {
          throw new Error()
        }
      },
      { retries: 7 }
    )
    return projectSummary
  } catch (e) {
    return null
  }
}

async function removeProjectSummary (projectId: string) {
  try {
    await pRetry(
      async () => {
        const projectSummary = await DIContainer.sharedContainer.projectSummaryRepository.getById(
          `MPProjectSummary:${projectId}`
        )

        if (!projectSummary) {
          return true
        } else {
          throw new Error()
        }
      },
      { retries: 7 }
    )
    return true
  } catch (e) {
    return false
  }
}

async function addUserCollaborator (userID: string) {
  try {
    const userCollaborator = await pRetry(
      async () => {
        const userCollaborator = await DIContainer.sharedContainer.userCollaboratorRepository.getByUserId(
          userID.replace('_', '|')
        )

        if (userCollaborator) {
          return userCollaborator
        } else {
          throw new Error()
        }
      },
      { retries: 7 }
    )

    return userCollaborator
  } catch (e) {
    return null
  }
}

async function removeProjectMemento (userID: string) {
  try {
    await pRetry(
      async () => {
        const projectMemento = await DIContainer.sharedContainer.projectMementoRepository.getByUserId(
          userID.replace('_', '|')
        )

        if (projectMemento.length === 0) {
          return true
        } else {
          throw new Error()
        }
      },
      { retries: 7 }
    )
    return true
  } catch (e) {
    return false
  }
}

describe('container-related-function', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await dropBucket(BucketKey.DerivedData)
  })

  beforeAll(async () => {
    const { functionService } = DIContainer.sharedContainer
    const functions = await functionService.getFunctions(db)

    await Promise.all(
      functions.map(async func => {
        if (!func.settings.deployment_status) {
          await functionService.deployFunction(db, func.appname)
        }

        if (!func.settings.processing_status) {
          await pRetry(
            async () => {
              throw new Error()
            },
            { retries: 7 }
          )
        }
      })
    )
  })

  test('should create project memento when a user lose access to the project', async () => {
    const {
      projectRepository,
      projectMementoRepository,
      userProfileRepository,
      userCollaboratorRepository
    } = DIContainer.sharedContainer

    const userProfile: any = await userProfileRepository.create(
      validUserProfile,
      {}
    )

    const userProfile2: any = await userProfileRepository.create(
      validUserProfile2,
      {}
    )

    expect(userProfile.id).toBe(validUserProfile._id)
    expect(userProfile2.id).toBe(validUserProfile2._id)

    await projectRepository.create(
      {
        ...validProjectForMemento,
        writers: [validUserProfile.userID],
        owners: [validUserProfile2.userID]
      },
      {}
    )

    const x = await addUserCollaborator(validUserProfile.userID)
    if (!x) {
      return fail('user collaborator are not added')
    }

    const y = await addUserCollaborator(validUserProfile2.userID)
    if (!y) {
      return fail('user collaborator are not added')
    }

    await projectRepository.patch(
      validProjectForMemento._id,
      {
        _id: validProjectForMemento._id,
        writers: []
      },
      {}
    )

    const projectMementos = await addProjectMementos(validUserProfile.userID)

    if (!projectMementos) {
      await Promise.all([
        await userCollaboratorRepository.remove(x[0]._id),
        await userCollaboratorRepository.remove(y[0]._id)
      ])
      return fail('Project memento failed to be created')
    }

    await projectMementoRepository.remove(projectMementos[0]._id)
  })

  test('should create project memento for each user when a project deleted', async () => {
    const {
      projectRepository,
      projectMementoRepository
    } = DIContainer.sharedContainer

    await projectRepository.create(
      {
        ...validProjectForMemento,
        writers: [validUserProfile.userID],
        owners: [validUserProfile2.userID]
      },
      {}
    )

    await projectRepository.remove(validProjectForMemento._id)

    const projectMementos = await addProjectMementos(
      validUserProfile.userID
    )

    if (!projectMementos || projectMementos.length === 0) {
      fail(`A project memento for ${validUserProfile.userID} must be created`)
    }

    const projectMementos2 = await addProjectMementos(
      validUserProfile2.userID
    )

    if (!projectMementos2) {
      fail(`A project memento for ${validUserProfile2.userID} must be created`)
    }

    await Promise.all([
      projectMementoRepository.remove(projectMementos[0]._id),
      projectMementoRepository.remove(projectMementos2[0]._id)
    ])
  })

  test.skip('remove project memento when a user regain access to the project', async () => {
    const {
      projectRepository,
      projectMementoRepository,
      userProfileRepository,
      userCollaboratorRepository
    } = DIContainer.sharedContainer

    const userProfile: any = await userProfileRepository.create(
      validUserProfile,
      {}
    )

    const userProfile2: any = await userProfileRepository.create(
      validUserProfile2,
      {}
    )

    expect(userProfile.id).toBe(validUserProfile._id)
    expect(userProfile2.id).toBe(validUserProfile2._id)

    await projectRepository.create(
      {
        ...validProjectForMemento,
        writers: [validUserProfile.userID],
        owners: [validUserProfile2.userID]
      },
      {}
    )

    const x = await addUserCollaborator(validUserProfile.userID)
    if (!x) {
      return fail('user collaborator are not added')
    }

    const y = await addUserCollaborator(validUserProfile2.userID)
    if (!y) {
      return fail('user collaborator are not added')
    }

    await projectRepository.patch(
      validProjectForMemento._id,
      {
        _id: validProjectForMemento._id,
        writers: []
      },
      {}
    )

    const projectMementos = await addProjectMementos(validUserProfile.userID)

    if (!projectMementos) {
      return fail('Project memento failed to be created')
    }

    await projectRepository.patch(
      validProjectForMemento._id,
      {
        _id: validProjectForMemento._id,
        writers: [validUserProfile.userID]
      },
      {}
    )

    const isRemoved = await removeProjectMemento(validUserProfile.userID)
    if (!isRemoved) {
      await Promise.all([
        await userCollaboratorRepository.remove(x[0]._id),
        await userCollaboratorRepository.remove(y[0]._id),
        await projectMementoRepository.remove(projectMementos[0]._id)
      ])
      return fail('Project memento failed to be removed.')
    }
  })

  test('should create project summary when a project is created and update when any project contained object is updated and remove when the project is removed', async () => {
    const {
      projectRepository,
      userProfileRepository
    } = DIContainer.sharedContainer

    const userProfile: any = await userProfileRepository.create(
      validUserProfile,
      {}
    )

    const userProfile2: any = await userProfileRepository.create(
      validUserProfile2,
      {}
    )

    expect(userProfile.id).toBe(validUserProfile._id)
    expect(userProfile2.id).toBe(validUserProfile2._id)

    await projectRepository.create(
      {
        ...validProjectForSummary,
        owners: [validUserProfile.userID]
      },
      {}
    )

    const projectSummary = await addProjectSummary(
      `MPProject:${validProjectForSummary._id}`
    )
    if (!projectSummary) {
      return fail('Project summary failed to be created')
    }

    await projectRepository.patch(
      validProjectForSummary._id,
      {
        _id: validProjectForSummary._id,
        viewers: [validUserProfile2.userID]
      },
      {}
    )

    const projectSummaryUpdated = await updateProjectSummary(
      `MPProject:${validProjectForSummary._id}`,
      projectSummary.updatedAt
    )

    if (!projectSummaryUpdated) {
      return fail('Project summary failed to be updated')
    }

    await projectRepository.remove(validProjectForSummary._id)

    const isProjectSummaryDeleted = await removeProjectSummary(
      `MPProject:${validProjectForSummary._id}`
    )

    if (!isProjectSummaryDeleted) {
      return fail('Project summary failed to be removed')
    }
  })
})
