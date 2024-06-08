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

export const userWithValidCredentials = {
  _id: 'User|9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
  name: 'Valid System User',
  email: 'valid-user@manuscriptsapp.com',
}

export const validUserStatus = {
  blockUntil: null,
  password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
  isVerified: true,
  deviceSessions: {
    deviceId: {
      data: 'syncSession123',
    },
  },
}

export const validJWTToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJVc2VyfHZhbGlkLXVzZXItMUBtYW51c2NyaXB0c2FwcC5jb20iLCJ0b2tlbklkIjoiOTFmNGRhNmIxY2MyNThlZjA1MmQ5NTgwMGRmMTNhMzdkNWY1ZWNkZiIsImFwcElkIjoiYXBwSWQiLCJpYXQiOjE1MTczMjg3NTR9.iUrkYzSDMH8N-YdeveEE3lFyYbfwGsvGW_LcDzJ9Vpw'

export const validUserToken = {
  _id: '91f4da6b1cc258ef052d95800df13a37d5f5ecdf',
  userId: '9f338224-b0d5-45aa-b02c-21c7e0c3c07a',
  hasExpiry: true,
  deviceId: 'deviceId',
  token: validJWTToken,
}

export const invalidJWTToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5ZjMzODIyNC1iMGQ1LTQ1YWEtYjAyYy0yMWM3ZTBjM2MwN2EiLCJoYXNFeHBpcnkiOnRydWUsImRldmljZUlkIjoiIn0.vm8QE4vpNMxUqWyU70FIdmpLYWNYYVlJ9csx5zhPXAw'

export const invalidUserJWTToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiMDMzYzkxY2QtNzBmNS01ODgwLTk2NmYtMzBjMGU2MGEzMWFlIiwidXNlcklkIjoiSW52YWxpZCB1c2VyIiwiYXBwSWQiOiJhcHBJZCIsImlhdCI6MTUxODUxNzI2OH0.gxUc_LKg9_VlBTLTdnq7aCFoD3bwUWXUms13fLEaTpY'

export const stringPayloadToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ImEgc3RyaW5nIGFzIGEgcGF5bG9hZCI.CKB6OJTOpCF3Vq8DMcxBmj7PJCEQQfBQqX9RCuxbcNw'
