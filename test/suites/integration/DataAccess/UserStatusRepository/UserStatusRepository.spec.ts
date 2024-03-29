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

import { Chance } from 'chance'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { testDatabase } from '../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

const chance = new Chance()
jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => (db = await testDatabase()))
afterAll(() => db.bucket.disconnect())

describe('UserStatusRepository create', () => {
  test('should fail if blockUntil not a date', async () => {
    const newStatus: any = {
      _id: chance.hash(),
      password: chance.hash(),
      isVerified: true,
      blockUntil: 'abc',
      createdAt: new Date().getTime(),
    }

    return expect(
      DIContainer.sharedContainer.userStatusRepository.create(newStatus)
    ).rejects.toThrow()
  })
})
