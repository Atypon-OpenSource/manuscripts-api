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

import jwt from 'jsonwebtoken'

import { config } from '../../../src/Config/Config'

const validLogoutTokenObj = {
  aud: 'manuscripts',
  sub: 'something',
  iss: config.IAM.authServerURL,
  iat: 1571747294,
  jti: '7a52c957-2c23-4ab1-b20e-cbc4d220af28',
  events: {
    'http://schemas.openid.net/event/backchannel-logout': {}
  },
  sid: 'random-session-id'
}

const validLogoutToken2Obj = {
  aud: 'manuscripts',
  sub: 'something',
  iss: 'https://iam-test.atypon.com',
  iat: 1571747294,
  jti: '7a52c957-2c23-4ab1-b20e-cbc4d220af28',
  events: {
    'http://schemas.openid.net/event/backchannel-logout': {}
  },
  sid: 'random-session-id-2'
}

const invalidLogoutTokenObj = {
  aud: 'manuscripts',
  sub: 'something',
  iss: 'https://iam-test.atypon.com',
  iat: 1571747294,
  jti: '7a52c957-2c23-4ab1-b20e-cbc4d220af28',
  events: {
    'http://schemas.openid.net/event/backchannel-logout': {}
  },
  sid: 'invalid-session-id'
}

export const validLogoutToken = jwt.sign(validLogoutTokenObj, 'jwt')

export const validLogoutToken2 = jwt.sign(validLogoutToken2Obj, 'jwt')

export const invalidLogoutToken = jwt.sign(invalidLogoutTokenObj, 'jwt')
