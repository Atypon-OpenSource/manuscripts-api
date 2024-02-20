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

import checksum from 'checksum'

import { NewSingleUseToken, SingleUseTokenType } from '../../../src/Models/SingleUseTokenModels'
import { INewUser } from '../../../src/Models/UserModels'

export const userList: INewUser[] = []

userList.push({
  _id: checksum('valid-sub', { algorithm: 'sha1' }),
  name: 'Valid System User',
  email: 'valid-sub-user@manuscriptsapp.com',
})

userList.push({
  _id: 'valid-user@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-user@manuscriptsapp.com',
  connectUserID: 'valid-connect-user-id',
})

userList.push({
  _id: 'valid-user-6@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-user-6@manuscriptsapp.com',
  connectUserID: 'valid-connect-user-6-id',
})

userList.push({
  _id: 'valid-user-7@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-user-7@manuscriptsapp.com',
  connectUserID: 'valid-connect-user-7-id',
})

userList.push({
  _id: 'valid-user-3@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-user-3@manuscriptsapp.com',
})

userList.push({
  _id: 'valid-google@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-google@manuscriptsapp.com',
})

userList.push({
  _id: 'valid-user-2@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-user-2@manuscriptsapp.com',
})

userList.push({
  _id: 'valid-user-1@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-user-1@manuscriptsapp.com',
})

userList.push({
  _id: 'valid-user2@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-user2@manuscriptsapp.com',
})

userList.push({
  _id: 'valid-user-blocked@manuscriptsapp.com',
  email: 'valid-user-blocked@manuscriptsapp.com',
  name: 'Valid Blocked User',
})

userList.push({
  _id: 'valid-google2@manuscriptsapp.com',
  name: 'Valid System User',
  email: 'valid-google2@manuscriptsapp.com',
})

export const singleUseTokens: NewSingleUseToken[] = []

singleUseTokens.push({
  _id: 'foobarbaz',
  userId: 'User|valid-user@manuscriptsapp.com',
  tokenType: SingleUseTokenType.ResetPasswordToken,
  createdAt: new Date(1900, 1, 1).getTime(),
})

singleUseTokens.push({
  _id: 'foofoobaz',
  userId: '9f33d224-b015-45ba-b02c-2197e0c3c47c',
  tokenType: SingleUseTokenType.ResetPasswordToken,
  createdAt: new Date(1900, 1, 1).getTime(),
})

singleUseTokens.push({
  _id: 'foobarbaz2',
  userId: 'User|valid-user@manuscriptsapp.com',
  tokenType: SingleUseTokenType.VerifyEmailToken,
  createdAt: new Date(1900, 1, 1).getTime(),
})

singleUseTokens.push({
  _id: 'foobarbaz3',
  userId: '9f33d224-b015-45ba-b02c-2197e0c3c47c',
  tokenType: SingleUseTokenType.VerifyEmailToken,
  createdAt: new Date(1900, 1, 1).getTime(),
})

singleUseTokens.push({
  _id: 'foobarbaz4',
  userId: '9f33d224-b015-45ba-b02c-2197e0c3c47h',
  tokenType: SingleUseTokenType.ResetPasswordToken,
  createdAt: new Date(1900, 1, 1).getTime(),
})
