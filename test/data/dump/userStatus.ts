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

import { UserStatus } from '../../../src/Models/UserModels'

export const userStatusList: UserStatus[] = []

userStatusList.push({
  _id: 'User|valid-user@manuscriptsapp.com',
  password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
  isVerified: true,
  createdAt: new Date(1518357671676),
  blockUntil: null,
  deviceSessions: {}
})

userStatusList.push({
  _id: 'User|valid-user-6@manuscriptsapp.com',
  password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
  isVerified: true,
  createdAt: new Date(1518357671676),
  blockUntil: null,
  deviceSessions: {}
})

userStatusList.push({
  _id: 'User|valid-google@manuscriptsapp.com',
  isVerified: true,
  createdAt: new Date(1518357671676),
  blockUntil: null,
  deviceSessions: {},
  password: ''
})

userStatusList.push({
  _id: 'User|valid-user-2@manuscriptsapp.com',
  password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
  isVerified: false,
  createdAt: new Date(1518357671676),
  blockUntil: null,
  deviceSessions: {}
})

userStatusList.push({
  _id: 'User|valid-user-3@manuscriptsapp.com',
  password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
  isVerified: false,
  createdAt: new Date(1518357671676),
  deviceSessions: {},
  blockUntil: null
})

userStatusList.push({
  _id: 'User|valid-user-blocked@manuscriptsapp.com',
  password: '$2a$05$LpEIAuWg7aF4leM9aZaKDO3.7r.6IkkcS4qrj5qMhHZEWzFoZHrv.',
  isVerified: false,
  createdAt: new Date(1518357671676),
  deviceSessions: {},
  blockUntil: new Date(2518357671610)
})

userStatusList.push({
  _id: 'User|valid-google2@manuscriptsapp.com',
  isVerified: true,
  createdAt: new Date(1518357671676),
  blockUntil: null,
  deviceSessions: {},
  password: ''
})
