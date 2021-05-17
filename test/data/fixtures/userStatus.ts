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

import moment from 'moment'

export const blockedStatus = {
  _id: 'User|valid-user@manuscriptsapp.com',
  blockUntil: moment(new Date())
    .add(60000, 'ms')
    .toDate(),
  createdAt: new Date(),
  deviceSessions: {},
  isVerified: false,
  password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.'
}

export const notVerifiedStatus = {
  _id: 'User|valid-user@manuscriptsapp.com',
  blockUntil: null,
  createdAt: new Date(),
  deviceSessions: {},
  isVerified: false,
  password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.'
}

export const blockedStatusButBlockTimeExpired = {
  _id: 'User|valid-user@manuscriptsapp.com',
  blockUntil: moment(new Date())
    .add(-60000, 'ms')
    .toDate(),
  createdAt: new Date(),
  deviceSessions: {},
  isVerified: true,
  password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.'
}
