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

import * as jsonwebtoken from 'jsonwebtoken'
import { Chance } from 'chance'

import { AuthStrategy } from '../../../../../../src/Auth/Passport/AuthStrategy'
import { InvalidServerCredentialsError } from '../../../../../../src/Errors'
import { config } from '../../../../../../src/Config/Config'
import { getMockRes } from '@jest-mock/express'

const chance = new Chance()

describe('AdminTokenStrategy', () => {
  test('verifyAdminToken valid token should not throw error', () => {
    const req: any = {
      headers: {
        authorization: `Bearer ${jsonwebtoken.sign(
          { email: chance.email() },
          config.auth.serverSecret
        )}`,
      },
    }

    const { res, next } = getMockRes()

    AuthStrategy.verifyAdminToken(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toEqual(undefined)
  })

  test('verifyAdminToken with missing authorization header should throw error', () => {
    const req: any = {
      headers: {},
    }
    const { res, next } = getMockRes()

    AuthStrategy.verifyAdminToken(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(InvalidServerCredentialsError)
  })

  test('verifyAdminToken with a token that was signed with wrong secret should throw error', () => {
    const req: any = {
      headers: {
        authorization: `Bearer ${jsonwebtoken.sign({ email: chance.email() }, chance.hash())}`,
      },
    }
    const { res, next } = getMockRes()

    AuthStrategy.verifyAdminToken(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(InvalidServerCredentialsError)
  })
})
