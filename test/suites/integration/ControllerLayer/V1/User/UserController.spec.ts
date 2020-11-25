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

import { ValidationError, DiscourseError } from '../../../../../../src/Errors'
import { UserController } from '../../../../../../src/Controller/V1/User/UserController'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'
import { generateLoginToken } from '../../../../../../src/Utilities/JWT/LoginTokenPayload'
import { DiscourseController } from '../../../../../../src/DomainServices/Discourse/DiscourseController'
import { DiscourseService } from '../../../../../../src/DomainServices/Discourse/DiscourseService'

jest.setTimeout(TEST_TIMEOUT)

describe('UserController - markUserForDeletion', () => {

  test('should fail if user not found', () => {
    const req: any = {
      body: {}
    }

    const userController = new UserController()
    return expect(userController.markUserForDeletion(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the password defined but is not a string', async () => {
    const req: any = {
      body: {
        password: 123
      },
      user: { _id: 'foo' }
    }

    const userController = new UserController()
    return expect(userController.markUserForDeletion(req)).rejects.toThrowError(ValidationError)
  })

})

describe('UserController - unmarkUserForDeletion', () => {

  test('should fail if user not found', () => {
    const req: any = {
      body: {}
    }

    const userController = new UserController()
    return expect(userController.unmarkUserForDeletion(req)).rejects.toThrowError(ValidationError)
  })

})

describe('UserController - getProfile', () => {
  test('should fail if the token is not a bearer token', () => {
    const chance = Chance()
    const req: any = {
      headers: {
        authorization: chance.string()
      }
    }

    const userController = new UserController()
    return expect(userController.getProfile(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the token is undefined', () => {
    const req: any = {
      headers: {
        authorization: undefined
      }
    }

    const userController = new UserController()
    return expect(userController.getProfile(req)).rejects.toThrowError(ValidationError)
  })

  test('should fail if the token is not a bearer token', () => {
    const chance = Chance()
    const req: any = {
      headers: {
        authorization: [chance.string(), chance.string()]
      }
    }

    const userController = new UserController()
    return expect(userController.getProfile(req)).rejects.toThrowError(ValidationError)
  })

  test('Post feedback to Discourse fails with a made up bearer token', () => {
    const chance = Chance()
    const req: any = {
      headers: {
        authorization: [chance.string(), chance.string()]
      }
    }
    const discourseService = new DiscourseService({
      ssoSecret: 'much secret, very wow',
      url: 'http://foobar.com',
      feedbackCategoryID: '123',
      apiKey: 'x',
      adminUsername: 'y'
    })
    const discourseController = new DiscourseController(discourseService)
    return expect(discourseController.postFeedback(req)).rejects.toThrowError(ValidationError)
  })

  test('Post feedback to Discourse succeeds with a valid bearer token + body', async () => {
    const goodAuthPayload = {
      tokenId: 'foo',
      userId: 'bar',
      appId: 'foobar',
      email: 'foo@bar.com',
      'userProfileId': 'foo'
    }
    const authToken = generateLoginToken(goodAuthPayload, null)
    const goodReq: any = {
      headers: { authorization: `Bearer ${authToken}` },
      body: {
        title: 'Feedback title',
        message: 'Feedback message',
        messagePrivately: true
      },
      user: {
        _id: 'MPUser:keppo',
        email: 'keppo@kekkonen.org'
      }
    }
    const discourseService: any = new DiscourseService({
      ssoSecret: 'much secret, very wow',
      url: 'http://foobar.com',
      feedbackCategoryID: '123',
      apiKey: 'x',
      adminUsername: 'y'
    })
    const discourseController = new DiscourseController(discourseService)
    discourseService.ensureDiscourseUserExists = () => {
      return { id: '12345' }
    }
    discourseService.postFeedbackRequest = () => Promise.resolve({ statusCode: 400 })
    await expect(discourseController.postFeedback(goodReq)).rejects.toThrowError(DiscourseError)

    discourseService.postFeedbackRequest = () => Promise.resolve({ statusCode: 200, body: '{}' })
    await expect(discourseController.postFeedback(goodReq)).resolves.toBeTruthy()
  })
})
