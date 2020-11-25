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

export const validBody = {
  email: 'valid-user@manuscriptsapp.com',
  password: '12345',
  deviceId: 'deviceId'
}

export const validBody2 = {
  email: 'valid-user-6@manuscriptsapp.com',
  password: '12345',
  deviceId: 'deviceId'
}

export const invalidBody = {
  email: 'invalid-user@manuscriptsapp.com',
  password: '123456789',
  deviceId: 'deviceId'
}

export const validEmailBody = {
  email: 'valid-user@manuscriptsapp.com',
  password: '123456',
  deviceId: 'deviceId'
}

export const invalidPasswordBody = {
  email: 'valid-user@manuscriptsapp.com',
  password: '123456789',
  deviceId: 'deviceId'
}

export const emptyEmailBody = {
  email: '',
  password: 'Script@123@M@nu',
  deviceId: 'deviceId'
}

export const emptyPasswordBody = {
  email: 'valid-user@manuscriptsapp.com',
  password: '',
  deviceId: 'deviceId'
}

export const emptyBodyElements = {
  email: '',
  password: '',
  deviceId: 'deviceId'
}
