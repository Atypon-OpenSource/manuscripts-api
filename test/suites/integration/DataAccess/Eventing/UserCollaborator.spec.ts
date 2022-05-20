/*!
 * © 2022 Atypon Systems LLC
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

jest.mock('../../../../../src/DomainServices/External/AWS', () => ({
  SES: { sendEmail: jest.fn((_foo, callback) => callback(null, { foo: 1 })) }
}))

import pRetry from 'p-retry'

import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, testDatabase, dropBucket } from '../../../../utilities/db'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import {
  validUserProfile,
  validUserProfile2
} from '../../../../data/fixtures/UserRepository'
import { validProject, validProject6 } from '../../../../data/fixtures/projects'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'

let db: any = null

beforeAll(async () => (db = await testDatabase()))
afterAll(() => db.bucket.disconnect())

jest.setTimeout(TEST_TIMEOUT * 2)

async function addUserCollaborator (userID: string) {
  const userCollaborator = await pRetry(
    async () => {
      const userCollaborator = await DIContainer.sharedContainer.userCollaboratorRepository.getByUserId(
        userID
      )

      if (userCollaborator) {
        return userCollaborator
      } else {
        throw new Error()
      }
    },
    { retries: 20 }
  )

  return userCollaborator.length ? userCollaborator : []
}

async function addProjectToUserCollaborator (
  role: string,
  userID: string,
  projectID: string
) {
  const isAdded = await pRetry(async () => {
    const userCollaborators = await DIContainer.sharedContainer.userCollaboratorRepository.getByUserId(
      userID
    )
    for (const uc of userCollaborators) {
      if (
        uc &&
        uc.projects &&
        uc.projects[role].includes(projectID)
      ) {
        return true
      }
    }

    throw new Error()

  }, { retries: 20 })

  return isAdded ? true : false
}

async function removeProjectFromUserCollaborator (
  role: string,
  userID: string,
  projectID: string
) {
  const isRemoved = await pRetry(async () => {
    const userCollaborators = await DIContainer.sharedContainer.userCollaboratorRepository.getByUserId(
      userID
    )

    for (const uc of userCollaborators) {
      if (
        uc &&
        uc.projects &&
        !uc.projects[role].includes(projectID)
      ) {
        return true
      }
    }

    throw new Error()
  }, { retries: 20 })

  return isRemoved ? true : false
}

describe('user-collaborator-function', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await dropBucket(BucketKey.User)
  })

  test('should create userCollaborator when 2 users collaborate on a project', async () => {
    const {
      userProfileRepository,
      userCollaboratorRepository,
      projectRepository
    } = DIContainer.sharedContainer

    const userProfile: any = await userProfileRepository.create(
      validUserProfile,
    )

    const userProfile2: any = await userProfileRepository.create(
      validUserProfile2,
    )

    expect(userProfile._id).toBe(validUserProfile._id)
    expect(userProfile2._id).toBe(validUserProfile2._id)

    await projectRepository.create(
      {
        ...validProject,
        viewers: [validUserProfile.userID],
        owners: [validUserProfile2.userID]
      },
    )

    const userCollaborator = await addUserCollaborator(validUserProfile.userID)
    const userCollaborator2 = await addUserCollaborator(
      validUserProfile2.userID
    )

    if (!userCollaborator || !userCollaborator2) {
      return fail(
        'userCollaborator and userCollaborator2 must not be undefined/null'
      )
    }

    await Promise.all([
      userCollaboratorRepository.remove(userCollaborator[0]._id),
      userCollaboratorRepository.remove(userCollaborator2[0]._id)
    ])

    const userCollaboratorAfter = await userCollaboratorRepository.getById(
      userCollaborator[0]._id
    )
    const userCollaborator2After = await userCollaboratorRepository.getById(
      userCollaborator2[0]._id
    )

    expect(userCollaboratorAfter).toBeNull()
    expect(userCollaborator2After).toBeNull()
  })

  test('should remove all userCollaborators objects related to a userProfile, when the user profile is deleted', async () => {
    const {
      userProfileRepository,
      userCollaboratorRepository,
      projectRepository
    } = DIContainer.sharedContainer

    const userProfile: any = await userProfileRepository.create(
      validUserProfile,
    )

    const userProfile2: any = await userProfileRepository.create(
      validUserProfile2,
    )

    expect(userProfile._id).toBe(validUserProfile._id)
    expect(userProfile2._id).toBe(validUserProfile2._id)

    await projectRepository.create(
      {
        ...validProject,
        viewers: [validUserProfile.userID],
        owners: [validUserProfile2.userID]
      },
    )

    const userCollaborator = await addUserCollaborator(validUserProfile.userID)
    const userCollaborator2 = await addUserCollaborator(
      validUserProfile2.userID
    )

    if (!userCollaborator || !userCollaborator2) {
      return fail(
        'userCollaborator and userCollaborator2 must not be undefined/null'
      )
    }

    await userProfileRepository.remove(validUserProfile._id)

    let userCollaboratorAfter: any = userCollaborator
    for (let count = 0; count < 10000; count++) {
      userCollaboratorAfter = await userCollaboratorRepository.getById(
        userCollaborator[0]._id
      )

      if (!userCollaboratorAfter) {
        break
      }
    }

    expect(userCollaboratorAfter).toBeNull()

    let userCollaborator2After: any = userCollaborator2
    for (let count = 0; count < 10000; count++) {
      userCollaborator2After = await userCollaboratorRepository.getById(
        userCollaborator2[0]._id
      )

      if (!userCollaborator2After) {
        break
      }
    }

    expect(userCollaborator2After).toBeNull()
  })

  test('should add project id to projects list when both users collaborate on a second project and remove it when collaboration ends', async () => {
    const {
      userProfileRepository,
      userCollaboratorRepository,
      projectRepository
    } = DIContainer.sharedContainer

    const userProfile: any = await userProfileRepository.create(
      validUserProfile
    )

    const userProfile2: any = await userProfileRepository.create(
      validUserProfile2
    )

    expect(userProfile._id).toBe(validUserProfile._id)
    expect(userProfile2._id).toBe(validUserProfile2._id)

    await projectRepository.create(
      {
        ...validProject,
        viewers: [validUserProfile.userID],
        owners: [validUserProfile2.userID]
      }
    )

    const userCollaborator = await addUserCollaborator(validUserProfile.userID)
    const userCollaborator2 = await addUserCollaborator(
      validUserProfile2.userID
    )

    if (!userCollaborator || !userCollaborator2) {
      return fail(
        'userCollaborator and userCollaborator2 must not be undefined/null'
      )
    }

    await projectRepository.create(
      {
        ...validProject6,
        viewers: [validUserProfile2.userID],
        owners: [validUserProfile.userID]
      },
    )

    const isProjectAdded = await addProjectToUserCollaborator(
      'owner',
      validUserProfile2.userID,
      `MPProject:${validProject6._id}`
    )

    expect(isProjectAdded).toBeTruthy()

    await projectRepository.patch(
      validProject6._id,
      {
        _id: validProject6._id,
        viewers: []
      },
    )

    const isProjectRemoved = await removeProjectFromUserCollaborator(
      'owner',
      validUserProfile2.userID,
      `MPProject:${validProject6._id}`
    )

    expect(isProjectRemoved).toBeTruthy()

    await Promise.all([
      userCollaboratorRepository.remove(userCollaborator[0]._id),
      userCollaboratorRepository.remove(userCollaborator2[0]._id)
    ])

    const userCollaboratorAfter = await userCollaboratorRepository.getById(
      userCollaborator[0]._id
    )
    const userCollaborator2After = await userCollaboratorRepository.getById(
      userCollaborator2[0]._id
    )

    expect(userCollaboratorAfter).toBeNull()
    expect(userCollaborator2After).toBeNull()
  })

  test('should remove both userCollaborator object when no more shared projects left', async () => {
    const {
      userProfileRepository,
      userCollaboratorRepository,
      projectRepository
    } = DIContainer.sharedContainer

    const userProfile: any = await userProfileRepository.create(
      validUserProfile
    )

    const userProfile2: any = await userProfileRepository.create(
      validUserProfile2
    )

    expect(userProfile._id).toBe(validUserProfile._id)
    expect(userProfile2._id).toBe(validUserProfile2._id)

    await projectRepository.create(
      {
        ...validProject,
        viewers: [validUserProfile.userID],
        owners: [validUserProfile2.userID]
      }
    )

    const userCollaborator = await addUserCollaborator(validUserProfile.userID)
    const userCollaborator2 = await addUserCollaborator(
      validUserProfile2.userID
    )

    if (!userCollaborator || !userCollaborator2) {
      return fail(
        'userCollaborator and userCollaborator2 must not be undefined/null'
      )
    }

    await projectRepository.patch(
      validProject._id,
      {
        _id: validProject._id,
        viewers: []
      },
    )

    let userCollaboratorAfter: any = userCollaborator
    for (let count = 0; count < 10000; count++) {
      userCollaboratorAfter = await userCollaboratorRepository.getById(
        userCollaborator[0]._id
      )

      if (!userCollaboratorAfter) {
        break
      }
    }

    expect(userCollaboratorAfter).toBeNull()

    let userCollaborator2After: any = userCollaborator2
    for (let count = 0; count < 10000; count++) {
      userCollaborator2After = await userCollaboratorRepository.getById(
        userCollaborator2[0]._id
      )

      if (!userCollaborator2After) {
        break
      }
    }

    expect(userCollaborator2After).toBeNull()
  })

  test('should remove userCollaborator when the last shared project is deleted', async () => {
    const {
      userProfileRepository,
      userCollaboratorRepository,
      projectRepository
    } = DIContainer.sharedContainer

    const userProfile: any = await userProfileRepository.create(
      validUserProfile
    )

    const userProfile2: any = await userProfileRepository.create(
      validUserProfile2
    )

    expect(userProfile._id).toBe(validUserProfile._id)
    expect(userProfile2._id).toBe(validUserProfile2._id)

    await projectRepository.create(
      {
        ...validProject,
        viewers: [validUserProfile.userID],
        owners: [validUserProfile2.userID]
      }
    )

    const userCollaborator = await addUserCollaborator(validUserProfile.userID)
    const userCollaborator2 = await addUserCollaborator(
      validUserProfile2.userID
    )

    if (!userCollaborator || !userCollaborator2) {
      return fail(
        'userCollaborator and userCollaborator2 must not be undefined/null'
      )
    }

    await projectRepository.remove(validProject._id)

    let userCollaboratorAfter: any = userCollaborator
    for (let count = 0; count < 10000; count++) {
      userCollaboratorAfter = await userCollaboratorRepository.getById(
        userCollaborator[0]._id
      )

      if (!userCollaboratorAfter) {
        break
      }
    }

    expect(userCollaboratorAfter).toBeNull()

    let userCollaborator2After: any = userCollaborator2
    for (let count = 0; count < 10000; count++) {
      userCollaborator2After = await userCollaboratorRepository.getById(
        userCollaborator2[0]._id
      )

      if (!userCollaborator2After) {
        break
      }
    }

    expect(userCollaborator2After).toBeNull()
  })

  test('should update user collaborator when the user profile is updated', async () => {
    const {
      userProfileRepository,
      userCollaboratorRepository,
      projectRepository
    } = DIContainer.sharedContainer

    const userProfile: any = await userProfileRepository.create(
      validUserProfile,
    )

    const userProfile2: any = await userProfileRepository.create(
      validUserProfile2,
    )

    expect(userProfile._id).toBe(validUserProfile._id)
    expect(userProfile2._id).toBe(validUserProfile2._id)

    await projectRepository.create(
      {
        ...validProject,
        viewers: [validUserProfile.userID],
        owners: [validUserProfile2.userID]
      },
    )

    const userCollaborators = await addUserCollaborator(validUserProfile.userID)

    if (userCollaborators.length !== 2) {
      return fail('userCollaborators must have 2 records')
    }

    const usersName = [userCollaborators[0].collaboratorProfile.bibliographicName.given, userCollaborators[1].collaboratorProfile.bibliographicName.given]
    expect(usersName).toContain(
      validUserProfile2.bibliographicName.given
    )

    await userProfileRepository.patch(
      validUserProfile2._id,
      {
        ...validUserProfile2,
        bibliographicName: {
          ...validUserProfile2.bibliographicName,
          given: 'Ray'
        }
      },
    )

    let usersNameAfter = usersName
    for (let count = 0; count < 10000; count++) {
      let user1 = await userCollaboratorRepository.getById(userCollaborators[0]._id)
      let user2 = await userCollaboratorRepository.getById(userCollaborators[1]._id)
      if (user1 && user2) {
        usersNameAfter = [user1.collaboratorProfile.bibliographicName.given, user2.collaboratorProfile.bibliographicName.given]
      }
      if (usersNameAfter.includes('Ray')) {
        break
      }
    }

    expect(usersNameAfter).toContain('Ray')

    await Promise.all([
      userCollaboratorRepository.remove(userCollaborators[0]._id),
      userCollaboratorRepository.remove(userCollaborators[1]._id)
    ])

    const userCollaboratorAfter = await userCollaboratorRepository.getById(
      userCollaborators[0]._id
    )

    const userCollaborator2After = await userCollaboratorRepository.getById(
      userCollaborators[1]._id
    )

    expect(userCollaboratorAfter).toBeNull()
    expect(userCollaborator2After).toBeNull()
  })
})
