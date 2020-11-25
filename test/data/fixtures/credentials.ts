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

export const validCredentials = {
  email: 'valid-user@manuscriptsapp.com',
  password: '12345',
  deviceId: 'deviceId',
  appId: '9a9090d9-6f95-420c-b903-543f32b5140f',
  appSecret: 'Valid secret'
}

export const invalidCredentials = {
  email: 'invalid-user@manuscriptsapp.com',
  password: '123456789',
  deviceId: 'deviceId',
  appId: '9a9090d9-6f95-420c-b903-543f32b5140f',
  appSecret: 'Valid secret'
}

export const validEmailCredentials = {
  email: 'valid-user@manuscriptsapp.com',
  password: '123456',
  deviceId: 'deviceId',
  appId: '9a9090d9-6f95-420c-b903-543f32b5140f',
  appSecret: 'Valid secret'
}

export const invalidPasswordCredentials = {
  email: 'valid-user@manuscriptsapp.com',
  password: '123456789',
  deviceId: 'deviceId',
  appId: '9a9090d9-6f95-420c-b903-543f32b5140f',
  appSecret: 'Valid secret'
}

export const invalidTokenCredentials = {
  email: 'valid-user@manuscriptsapp.com',
  deviceId: 'deviceId',
  appId: '9a9090d9-6f95-420c-b903-543f32b5140f',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.not-valid-signature'
}

export const validTokenCredentials = {
  email: 'valid-user@manuscriptsapp.com',
  deviceId: 'deviceId',
  appId: '9a9090d9-6f95-420c-b903-543f32b5140f',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.iyS3EfaK9Kqh2JUbp-nx9fh3YqLZHSGJOJBGX9uwc2Q'
}

export const emptyEmailCredentials = {
  email: '',
  password: 'Script@123@M@nu',
  deviceId: 'deviceId',
  appId: '9a9090d9-6f95-420c-b903-543f32b5140f',
  appSecret: 'Valid secret'
}

export const emptyPasswordCredentials = {
  email: 'valid-user@manuscriptsapp.com',
  password: '',
  deviceId: 'deviceId',
  appId: '9a9090d9-6f95-420c-b903-543f32b5140f',
  appSecret: 'Valid secret'
}

export const emptyCredentialsElements = {
  email: '',
  password: '',
  deviceId: 'deviceId',
  appId: '9a9090d9-6f95-420c-b903-543f32b5140f',
  appSecret: 'Valid secret'
}
