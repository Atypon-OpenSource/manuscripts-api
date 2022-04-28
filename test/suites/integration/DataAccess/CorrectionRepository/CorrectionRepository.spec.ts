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
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'

jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase(false, BucketKey.Project)))
afterAll(() => db.bucket.disconnect())

describe('CorrectionRepository - getCorrectionStatus', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Project)
    await seed({ corrections: true })
  })
  test('Should fetch correction status', async () => {
    const status: any = await DIContainer.sharedContainer.correctionRepository.getCorrectionStatus('MPProject:valid-project-id-2')
    expect(status.accepted).toBe(3)
    expect(status.rejected).toBe(1)
    expect(status.proposed).toBe(1)
  })
})
