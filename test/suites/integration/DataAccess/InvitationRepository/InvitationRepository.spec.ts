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
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { InvitationRepository } from '../../../../../src/DataAccess/InvitationRepository/InvitationRepository'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase(false, BucketKey.Project)))
afterAll(() => db.bucket.disconnect())

describe('InvitationRepository getAllByEmail', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ invitations: true })
  })

  test('should get all invitations by email', async () => {
    const repository = new InvitationRepository(BucketKey.Project, db)

    const invitations: any = await repository.getAllByEmail(
      'valid-google@manuscriptsapp.com'
    )

    expect(invitations[0]).toBeDefined()
  })
})
