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

export interface User {
  id: string
  given: string
  family: string
  email: string
  connectUserID: string
}

export type ConnectSignupCredentials = {
  name: string
  email: string
  connectUserID: string
}

export type CreateUser = {
  given: string
  family: string
  email: string
  connectUserID: string
}

export type NameParts = {
  given: string
  family: string
}

export type UserCredentials = {
  deviceID: string
  connectUserID: string
}

export type TokenPayload = {
  email: string
  deviceID: string
  id: string
}
