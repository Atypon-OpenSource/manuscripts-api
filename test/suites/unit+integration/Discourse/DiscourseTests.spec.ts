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

import '../../../utilities/dbMock'

import { APP_ID_HEADER_KEY, APP_SECRET_HEADER_KEY } from '../../../../src/Controller/V1/Auth/AuthController'
import { DIContainer } from '../../../../src/DIContainer/DIContainer'
import { ValidationError, MissingQueryParameterError, DiscourseError, InvalidCredentialsError } from '../../../../src/Errors'
import { Chance } from 'chance'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'
import { generateLoginToken } from '../../../../src/Utilities/JWT/LoginTokenPayload'
import * as jsonwebtoken from 'jsonwebtoken'
import * as url from 'url'
import * as querystring from 'querystring'
import { DiscourseController } from '../../../../src/DomainServices/Discourse/DiscourseController'
import { DiscourseService } from '../../../../src/DomainServices/Discourse/DiscourseService'

jest.setTimeout(TEST_TIMEOUT)

jest.mock('request-promise-native')
const request = require('request-promise-native')

beforeEach(() => {
  request.mockClear()
  request.mockImplementation(() => Promise.resolve({ statusCode: 200 }));
  (DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

// Discourse backed functionality is tested largely with mocks and fakes in place because we can't actually plausibly make service calls.

// sso = 'nonce=very_wow_much_base64_so_query' | base64 encoded
// STwV8r+Tgruy4pqaNTtmxPDvkTtGKJSQPyVMljimzk0= // echo 'nonce=foo' | base64 | openssl dgst -sha256 -hmac 'bar' -binary | base64
const goodQuery = {
  sso: 'bm9uY2U9dmVyeV93b3dfbXVjaF9iYXNlNjRfc29fcXVlcnk=',
  sig: '6648376284f212b08cc66f18fc8a8f188bcf16072944add79be71939a3c8b218'
}

const discourseConfiguration = {
  ssoSecret: 'much secret, very wow',
  url: 'https://community.manuscripts.io',
  feedbackCategoryID: '123',
  apiKey: 'x',
  adminUsername: 'y'
}

describe('DiscourseController', () => {
  test('should call loginDiscourse function', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    discourseService.configuration = discourseConfiguration
    const origRedirectURLMethod = discourseService.discourseRedirectURL
    discourseService.discourseRedirectURL = jest.fn(() => 'http://foo.com')

    const chance = new Chance()

    const goodAuthPayload = {
      tokenId: 'foo',
      userId: 'bar',
      appId: 'foobar',
      email: 'foo@bar.com',
      'userProfileId': 'foo'
    }

    // going through the encode & decode hoops as encoding adds the 'iat' property.
    const authToken = generateLoginToken(goodAuthPayload, null)
    const decodedToken = jsonwebtoken.decode(authToken)

    const req = (): any => ({
      query: {
        sso: 'foo',
        sig: 'bar'
      },
      headers: {
        authorization: 'Bearer ' + authToken,
        [APP_ID_HEADER_KEY]: chance.string(),
        [APP_SECRET_HEADER_KEY]: chance.string()
      }
    })

    const reqA = req()

    const discourseController = new DiscourseController(DIContainer.sharedContainer.discourseService!)
    discourseController.discourseLogin(reqA)
    expect(discourseService.discourseRedirectURL).toBeCalledWith(reqA.query.sso, reqA.query.sig, decodedToken)

    const reqB = req()
    reqB.query.sso = null
    expect(() => { discourseController.discourseLogin(reqB) }).toThrowError(MissingQueryParameterError)

    const reqC = req()
    reqC.query.sig = null
    expect(() => { discourseController.discourseLogin(reqC) }).toThrowError(MissingQueryParameterError)

    const badAuthPayload = {
      tokenId: null,
      userId: 'bar',
      appId: 'foobar',
      email: 'foo@bar.com',
      'userProfileId': 'foo'
    }
    const badAuthToken = generateLoginToken(badAuthPayload as any, null)

    const reqD = req()
    reqD.headers.authorization = 'Bearer' + badAuthToken
    expect(() => { discourseController.discourseLogin(reqD) }).toThrowError(ValidationError)

    const goodReq = (): any => ({
      query: goodQuery,
      headers: {
        authorization: 'Bearer ' + authToken,
        [APP_ID_HEADER_KEY]: chance.string(),
        [APP_SECRET_HEADER_KEY]: chance.string()
      }
    })

    discourseService.discourseRedirectURL = origRedirectURLMethod

    const r = goodReq()
    const response = discourseController.discourseLogin(r)
    const urlComponents = url.parse(response.url)

    expect(urlComponents.hostname).toEqual('community.manuscripts.io')
    expect(urlComponents.path).toMatch(/\/session\/sso_login/)
    const q = querystring.parse(urlComponents.query!)
    expect(q.sso).toBeTruthy()
    expect(q.sig).toBeTruthy()
  })

  test('discourseAccountDetails should fail with no "user" property on user', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    discourseService.configuration = discourseConfiguration
    const discourseController = new DiscourseController(DIContainer.sharedContainer.discourseService!)
    return expect(() => discourseController.discourseAccountDetails({ } as any)).toThrowError(ValidationError)
  })

  test('discourseAccountDetails should succeed with "user" property set', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    discourseService.configuration = discourseConfiguration
    discourseService.getDiscourseUserID = () => ({
      username: 'foo',
      email: 'foo@bar.org'
    })

    const discourseController = new DiscourseController(DIContainer.sharedContainer.discourseService!)
    return expect(discourseController.discourseAccountDetails({ user: { _id: 'foo' } } as any)).toBeTruthy()
  })

  test('postFeedback should fail with no "user" property set', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    discourseService.configuration = discourseConfiguration
    const discourseController = new DiscourseController(DIContainer.sharedContainer.discourseService!)
    return expect(discourseController.postFeedback({ } as any)).rejects.toThrowError(ValidationError)
  })

  test('postFeedback should fail with "user" property set but no body set', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    discourseService.configuration = discourseConfiguration
    discourseService.getDiscourseUserID = () => ({
      username: 'foo',
      email: 'foo@bar.org'
    })
    const discourseController = new DiscourseController(DIContainer.sharedContainer.discourseService!)
    return expect(discourseController.postFeedback({ user: { _id: 'foo' } } as any)).rejects.toThrowError(ValidationError)
  })

  test('postFeedback should fail with "user" property set, "body" set, but no "messagePrivately" property set', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    discourseService.configuration = discourseConfiguration
    discourseService.getDiscourseUserID = () => ({
      username: 'foo',
      email: 'foo@bar.org'
    })
    const discourseController = new DiscourseController(DIContainer.sharedContainer.discourseService!)
    return expect(discourseController.postFeedback({ user: { _id: 'MPUser:foo' }, body: { } } as any)).rejects.toThrowError(ValidationError)
  })

  test('postFeedback should succeed with "user" property set, "body" set, "messagePrivately", "title", "message" in body', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    discourseService.configuration = discourseConfiguration
    discourseService.getDiscourseUserID = () => ({
      username: 'foo',
      email: 'foo@bar.org'
    })
    request.mockImplementation(() => ({ statusCode: 200, body: '{}' }))
    const discourseController = new DiscourseController(DIContainer.sharedContainer.discourseService!)
    return expect(discourseController.postFeedback({
      user: { _id: 'MPUser:foo' },
      body: {
        messagePrivately: false,
        title: 'Foobar',
        message: 'Hello world.'
      }
    } as any)).resolves.toBeTruthy()
  })

  test('should fail to create Discourse redirect URL with an invalid SSO signature', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    const emaillessAuthPayload = {
      tokenId: 'foo',
      userId: 'bar',
      appId: 'foobar',
      email: 'foo@bar.org',
      userProfileId: 'foo'
    }
    expect(() => {
      discourseService.discourseRedirectURL(goodQuery.sso, goodQuery.sig + '12345', emaillessAuthPayload)
    }).toThrowError(ValidationError)
  })

  test('should fail to create Discourse redirect URL with an emailless token payload', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    const emaillessAuthPayload = {
      tokenId: 'foo',
      userId: 'bar',
      appId: 'foobar',
      userProfileId: 'foo'
    }
    expect(() => {
      discourseService.discourseRedirectURL(goodQuery.sso, goodQuery.sig, emaillessAuthPayload)
    }).toThrowError(ValidationError)
  })

  test('should throw when attempting to call userSSOParameters() with an emailless user', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    expect(() => discourseService.userSSOParameters({ _id: 'foo' })).toThrowError(ValidationError)
  })

  test('should successfully encode userSSOParameters() with a valid identifiable user', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    expect(Object.keys(discourseService.userSSOParameters({ _id: 'foo', email: 'foo@bar.org' })).sort()).toEqual(['sig', 'sso'])
  })

  test('getDiscourseUserID should throw if status code is unexpected', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    request.mockImplementation(() => Promise.resolve({ statusCode: 500 }))
    return expect(discourseService.getDiscourseUserID({ _id: 'foo' })).rejects.toThrowError(DiscourseError)
  })

  test('getDiscourseUserID should throw if response body is unexpected', () => {
    const discourseService: any = DIContainer.sharedContainer.discourseService
    request.mockImplementation(() => Promise.resolve({ statusCode: 200, body: { derp: 'herp' } }))
    return expect(discourseService.getDiscourseUserID({ _id: 'foo' })).rejects.toThrowError(DiscourseError)
  })

  test('discourseLogin', () => {
    const reqWithoutSSO: any = {
      query: { sig: 'y' },
      headers: { 'authorization': 'Bearer derp' }
    }

    const discourseService = new DiscourseService({
      ssoSecret: 'much secret, very wow',
      url: 'http://foobar.com',
      feedbackCategoryID: '123',
      apiKey: 'x',
      adminUsername: 'y'
    })
    const discourseController: any = new DiscourseController(discourseService)
    expect(() => discourseController.discourseLogin(reqWithoutSSO)).toThrowError(MissingQueryParameterError)

    const reqWithoutSig: any = {
      query: { sso: 'x' },
      headers: {}
    }
    expect(() => discourseController.discourseLogin(reqWithoutSig)).toThrowError(MissingQueryParameterError)

    const reqWithoutHeaders: any = {
      query: { sig: 'x', sso: 'y' }
    }
    expect(() => discourseController.discourseLogin(reqWithoutHeaders)).toThrowError(ValidationError)

    const reqWithHeaders: any = {
      query: { sig: 'x', sso: 'y' },
      headers: { authorization: 'Bearer derp' }
    }
    expect(() => discourseController.discourseLogin(reqWithHeaders)).toThrowError(InvalidCredentialsError)

    const goodAuthPayload = {
      tokenId: 'foo',
      userId: 'bar',
      appId: 'foobar',
      email: 'foo@bar.com',
      'userProfileId': 'foo'
    }

    // going through the encode & decode hoops as encoding adds the 'iat' property.
    const authToken = generateLoginToken(goodAuthPayload, null)
    const goodReq: any = {
      query: { sig: 'x', sso: 'y' },
      headers: { authorization: `Bearer ${authToken}` }
    }

    discourseController.discourseRedirectURL = jest.fn()
    expect(() => discourseController.discourseLogin(goodReq)).toThrowError(ValidationError)

    // echo -n 'nonce=x' | base64 | openssl dgst -sha256 -hmac 'much secret, very wow' -binary | base64
    const correctlySignedReq: any = {
      query: {
        sig: '6648376284f212b08cc66f18fc8a8f188bcf16072944add79be71939a3c8b218',
        sso: 'bm9uY2U9dmVyeV93b3dfbXVjaF9iYXNlNjRfc29fcXVlcnk='
      },
      headers: { authorization: `Bearer ${authToken}` }
    }
    const loginResponse = discourseController.discourseLogin(correctlySignedReq)
    expect(loginResponse.url).toBeTruthy()
  })

  test('discourseAccountDetails should succeed when _id given', async () => {
    const discourseService = new DiscourseService({
      ssoSecret: 'much secret, very wow',
      url: 'http://foobar.com',
      feedbackCategoryID: '123',
      apiKey: 'x',
      adminUsername: 'y'
    })
    discourseService.getDiscourseUserID = () => Promise.resolve(null)
    const discourseController: any = new DiscourseController(discourseService)

    request.mockImplementation(() => ({ statusCode: 200, body: '{}' }))
    const userReq: any = {
      user: {
        _id: 'User|foo@bar.org',
        email: 'foo@bar.org'
      }
    }
    await expect(discourseController.discourseAccountDetails(userReq)).resolves.toBeTruthy()
  })

  test('postFeedback should fail with no user', async () => {
    const discourseService = new DiscourseService({
      ssoSecret: 'much secret, very wow',
      url: 'http://foobar.com',
      feedbackCategoryID: '123',
      apiKey: 'x',
      adminUsername: 'y'
    })
    discourseService.getDiscourseUserID = () => Promise.resolve(null)
    const discourseController: any = new DiscourseController(discourseService)

    const noUserReq: any = { }
    await expect(discourseController.postFeedback(noUserReq)).rejects.toThrowError(ValidationError)

    const userNoBodyReq: any = {
      user: {
        _id: 'User|foo@bar.org'
      }
    }
    await expect(discourseController.postFeedback(userNoBodyReq)).rejects.toThrowError(ValidationError)

    const userBodyNoMessagePrivatelyReq: any = {
      user: {
        _id: 'User|foo@bar.org'
      },
      body: { }
    }
    await expect(discourseController.postFeedback(userBodyNoMessagePrivatelyReq)).rejects.toThrowError(ValidationError)
  })
})
