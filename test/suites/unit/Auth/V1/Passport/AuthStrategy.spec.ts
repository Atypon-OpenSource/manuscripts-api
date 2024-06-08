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

import { getMockRes } from '@jest-mock/express'
import { Chance } from 'chance'
import { StatusCodes } from 'http-status-codes'

import { AuthStrategy } from '../../../../../../src/Auth/Passport/AuthStrategy'

jest.mock('passport', () => {
  const originalModule = jest.requireActual('passport')

  return {
    ...originalModule,
    use: () => Promise.resolve(),
    authenticate: (_name: string, options: any, callback: any) => {
      const user: any = {
        _id: 'd5108332658149c4c2b276e1b16a1f8dca7fd6af',
      }
      if (typeof options === 'function') {
        options(null, user)
      } else {
        callback(null, user)
      }

      return (_req: any, _res: any, next: any) => {
        next()
      }
    },
  }
})

describe('AuthStrategy', () => {
  test('should pass JWT authenticate middleware', () => {
    const req: any = {}
    const { res, next } = getMockRes()
    AuthStrategy.JWTAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual({
      _id: 'd5108332658149c4c2b276e1b16a1f8dca7fd6af',
    })
  })

  test('should return 401 if error is set', () => {
    const req: any = {}
    const { res, next } = getMockRes()
    const error = new Error()
    AuthStrategy.userValidationCallback(error, null, req, res, next)

    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED)
    expect(res.end).toHaveBeenCalled()
  })

  test('should return 401 if there if user not set', () => {
    const req: any = {}
    const { res, next } = getMockRes()
    AuthStrategy.userValidationCallback(null, null, req, res, next)

    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED)
    expect(res.end).toHaveBeenCalled()
  })

  test('should set user in req object and call next function', () => {
    const chance = new Chance()
    const req: any = {}
    const { res, next } = getMockRes()
    const user: any = {
      _id: chance.hash(),
      name: chance.name(),
    }
    AuthStrategy.userValidationCallback(null, user, req, res, next)

    expect(req.user).toEqual(user)
    expect(next).toHaveBeenCalled()
  })
})
