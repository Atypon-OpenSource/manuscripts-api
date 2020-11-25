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

import { UserTokenRepository } from '../../../../../src/DataAccess/UserTokenRepository/UserTokenRepository'
import { drop, testDatabase } from '../../../../utilities/db'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { validJWTToken } from '../../../../data/fixtures/authServiceUser'

const chance = new Chance()
jest.setTimeout(TEST_TIMEOUT)

let db: any = null
beforeAll(async () => db = await testDatabase())
afterAll(() => db.bucket.disconnect())

describe('UserTokenRepository getOne', () => {
  beforeEach(async () => {
    await drop()
  })

  test('should return token by id', async () => {
    const repository = new UserTokenRepository(db)
    const token = {
      _id: chance.hash(),
      userId: 'userId',
      hasExpiry: false,
      deviceId: 'deviceId',
      appId: 'appId',
      token: validJWTToken,
      credentials: { google: { accessToken: 'foo', refreshToken: 'bar' } }
    }

    await repository.create(token, {})

    const userToken: any = await repository.getOne({
      userId: 'userId',
      deviceId: 'deviceId',
      appId: 'appId'
    })

    expect(userToken._id).toEqual(token._id)
    expect(userToken.token).toEqual(token.token)
  })

  test('should return undefined if user token does not exists in db', async () => {
    const repository = new UserTokenRepository(db)
    const token = await repository.getOne({
      userId: 'userId',
      deviceId: 'deviceId',
      appId: 'appId'
    })
    expect(token).toBeNull()
  })
})
