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

import { ValidationError } from '../../../../../../src/Errors'
const mocRes = require('jest-mock-express')
import * as HttpStatus from 'http-status-codes'
import { Chance } from 'chance'

import { AuthStrategy } from '../../../../../../src/Auth/Passport/AuthStrategy'
import { validGoogleRequestWithHeader } from '../../../../../data/fixtures/requests'

jest.mock('passport', () => {
  const originalModule = jest.requireActual('passport')

  return {
    ...originalModule,
    use: () => Promise.resolve(),
    authenticate: (_name: string, options: any, callback: Function) => {
      const user: any = {
        _id: 'd5108332658149c4c2b276e1b16a1f8dca7fd6af'
      }
      if (typeof options === 'function') {
        options(null, user)
      } else {
        callback(null, user)
      }

      return (_req: any, _res: any, next: any) => {
        next()
      }
    }
  }
})

describe('AuthStrategy', () => {
  test('Google scope should be [profile, email]', () => {
    expect(AuthStrategy.googleScope).toEqual([
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ])
  })

  test('should pass JWT authenticate middleware', () => {
    const req: any = {}
    const res: any = mocRes.response()
    const next = jest.fn()
    AuthStrategy.JWTAuth(req, res, next)
    expect(next).toBeCalled()
    expect(req.user).toEqual({
      _id: 'd5108332658149c4c2b276e1b16a1f8dca7fd6af'
    })
  })

  test('should pass google authenticate middleware', () => {
    const req: any = validGoogleRequestWithHeader
    const res: any = mocRes.response()
    const next = jest.fn()
    AuthStrategy.googleRedirect(req, res, next)
    expect(next).toBeCalled()
    expect(req.user).toEqual({
      _id: 'd5108332658149c4c2b276e1b16a1f8dca7fd6af'
    })
  })

  test('should return 401 if error is set', () => {
    const req: any = {}
    const res: any = mocRes.response()
    const next = jest.fn()
    const error = new Error()
    AuthStrategy.userValidationCallback(error, null, req, res, next)

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
    expect(res.end).toBeCalled()
  })

  test('should return 401 if there if user not set', () => {
    const req: any = {}
    const res: any = mocRes.response()
    const next = jest.fn()
    AuthStrategy.userValidationCallback(null, null, req, res, next)

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
    expect(res.end).toBeCalled()
  })

  test('should redirect if error is set in google login', () => {
    const req: any = {}
    const res: any = mocRes.response()
    const next = jest.fn()
    const error = new Error()
    AuthStrategy.googleUserValidationCallback(error, null, req, res, next)

    expect(res.redirect).toBeCalled()
  })

  test('should redirect if user not set in google login', () => {
    const req: any = {}
    const res: any = mocRes.response()
    const next = jest.fn()
    AuthStrategy.googleUserValidationCallback(null, null, req, res, next)

    expect(res.redirect).toBeCalled()
  })

  test('should set user in req object and call next function', () => {
    const chance = new Chance()
    const req: any = {}
    const res: any = mocRes.response()
    const next = jest.fn()
    const user: any = {
      _id: chance.hash(),
      name: chance.name()
    }
    AuthStrategy.userValidationCallback(null, user, req, res, next)

    expect(req.user).toEqual(user)
    expect(next).toBeCalled()
  })

  test('should fail if scope is not found', () => {
    const req: any = {}
    const res: any = mocRes.response()
    const next = jest.fn()
    const scopedAuth = AuthStrategy.scopedJWTAuth('invalid-scope')
    expect(() => scopedAuth(req, res, next)).toThrow(ValidationError)
  })

  test('should pass scopedJWT authenticate', () => {
    const req: any = {}
    const res: any = mocRes.response()
    const next = jest.fn()
    const scopedAuth = AuthStrategy.scopedJWTAuth('file-picker')
    scopedAuth(req, res, next)
    expect(next).toBeCalled()
    expect(req.user).toEqual({
      _id: 'd5108332658149c4c2b276e1b16a1f8dca7fd6af'
    })
  })
})
