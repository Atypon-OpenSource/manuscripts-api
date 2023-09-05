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

import { UserToken } from '../../../src/Models/UserModels'

export const userTokens: any[] = []

export const userTokensList: UserToken[] = []

userTokensList.push({
  _id: 'foobarbaz',
  userId: 'User|valid-user@manuscriptsapp.com',
  hasExpiry: false,
  deviceId: 'deviceId',
  appId: 'manuscripts',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiOWYzMzgyMjQtYjBkNS00NWFhLWIwMmMtMjFjN2UwYzNjMDdhK2RldmljZUlkIiwidXNlcklkIjoiOWYzMzgyMjQtYjBkNS00NWFhLWIwMmMtMjFjN2UwYzNjMDdhIiwiYXBwSWQiOiI5YTkwOTBkOS02Zjk1LTQyMGMtYjkwMy01NDNmMzJiNTE0MGYiLCJpYXQiOjE1MjEzNzIwMzF9._NIY3-b9m1zfj-lZR1fzeoyNJSUcazv-_Ih8bZhEvfU',
})

userTokensList.push({
  _id: 'foobarbaz2',
  userId: 'User|foobar',
  hasExpiry: false,
  deviceId: 'deviceId',
  appId: 'manuscripts',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiOWYzMzgyMjQtYjBkNS00NWFhLWIwMmMtMjFjN2UwYzNjMDdhK2RldmljZUlkIiwidXNlcklkIjoiOWYzMzgyMjQtYjBkNS00NWFhLWIwMmMtMjFjN2UwYzNjMDdhIiwiYXBwSWQiOiI5YTkwOTBkOS02Zjk1LTQyMGMtYjkwMy01NDNmMzJiNTE0MGYiLCJpYXQiOjE1MjEzNzIwMzF9._NIY3-b9m1zfj-lZR1fzeoyNJSUcazv-_Ih8bZhEvfU',
})
