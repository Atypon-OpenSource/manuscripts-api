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

import { AuthStrategy } from '../../../src/Auth/Passport/AuthStrategy'

export const randomQueryString: any = {
  'key-1': 'value-1'
}

export const googleAuthOneTimeCode: any = {
  code: '4/7JWhU6yKbt4knIHjidfOspD0xDxasiBq3MG8HvksDRo#',
  scope: AuthStrategy.googleScopesString,
  state: JSON.stringify({
    deviceId: 'Device ID',
    appId: 'Application ID',
    appSecret: 'Application Secret'
  })
}

export const googleAuthOneTimeCodeNoState: any = {
  code: '4/7JWhU6yKbt4knIHjidfOspD0xDxasiBq3MG8HvksDRo#',
  scope: AuthStrategy.googleScopesString
}

export const googleAuthOneTimeCodeNoDeviceId: any = {
  code: '4/7JWhU6yKbt4knIHjidfOspD0xDxasiBq3MG8HvksDRo#',
  scope: AuthStrategy.googleScopesString,
  state: JSON.stringify({
    appId: 'Application ID',
    appSecret: 'Application Secret'
  })
}

export const googleAuthOneTimeCodeNoAppId: any = {
  code: '4/7JWhU6yKbt4knIHjidfOspD0xDxasiBq3MG8HvksDRo#',
  scope: AuthStrategy.googleScopesString,
  state: JSON.stringify({
    deviceId: 'Device ID',
    appSecret: 'Application Secret'
  })
}
