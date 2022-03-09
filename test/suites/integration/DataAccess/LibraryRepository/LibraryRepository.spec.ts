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
import { LibraryRepository } from '../../../../../src/DataAccess/LibraryRepository/LibraryRepository'
import { validLibrary } from '../../../../data/fixtures/libraries'
import { ContainerInvitationRepository } from '../../../../../src/DataAccess/ContainerInvitationRepository/ContainerInvitationRepository'
import { createLibrary, createLibraryInvitation } from '../../../../data/fixtures/misc'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase(false, BucketKey.Data)))
afterAll(() => db.bucket.disconnect())

describe('LibraryRepository - removeWithAllResources', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ })
  })

  test('should remove library with all its resources', async () => {
    const repository = new LibraryRepository(BucketKey.Data, db)
    const libraryInvitationRepository = new ContainerInvitationRepository(
      BucketKey.Data,
      db
    )
    const validId = `MPLibrary:valid-library-id-6`
    await createLibrary('valid-library-id-6')
    await createLibraryInvitation(checksum(
      'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-library-id-6',
      { algorithm: 'sha1' }
    ))
    const libraryBefore = await repository.getById(validId)
    const invitationBefore = await libraryInvitationRepository.getById(
      checksum(
        'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-library-id-6',
        { algorithm: 'sha1' }
      )
    )

    expect(libraryBefore!._id).toBe(validId)
    expect(invitationBefore).not.toBeNull()

    await repository.removeWithAllResources(validId)

    const libraryAfter = await repository.getById(validId)
    const invitationAfter = await libraryInvitationRepository.getById(
      checksum(
        'valid-user@manuscriptsapp.com-valid-user-6@manuscriptsapp.com-valid-library-id-6',
        { algorithm: 'sha1' }
      )
    )

    expect(libraryAfter).toBeNull()
    expect(invitationAfter).toBeNull()
  })
})

describe('LibraryRepository - getUserContainers', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed({ libraries: true })
  })

  test('should get library by user id', async () => {
    const repository = new LibraryRepository(BucketKey.Data, db)
    const validUserId = 'User_test'
    const libraries = await repository.getUserContainers(validUserId)

    expect(
      libraries.find(
        (library) => library._id === validLibrary._id
      )._id
    ).toBe(validLibrary._id)
  })
})
