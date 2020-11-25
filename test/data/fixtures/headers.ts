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

import { validApplication } from './applications'

export const ValidHeaderWithApplicationKey: any = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'manuscripts-app-id': validApplication._id,
  'manuscripts-app-secret': validApplication.secret
}

export const ValidHeaderWithCharsetAndApplicationKey: any = {
  'Accept': 'application/json; charset=UTF-8',
  'Content-Type': 'application/json; charset=UTF-8',
  'manuscripts-app-id': validApplication._id,
  'manuscripts-app-secret': validApplication.secret
}

export const ValidContentTypeAcceptJsonHeader: any = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}

export const ValidContentTypeAcceptWithCharsetJsonHeader: any = {
  'Accept': 'application/json; charset=UTF-8',
  'Content-Type': 'application/json; charset=UTF-8'
}

export const EmptyContentTypeAcceptJsonHeader: any = {
  'Accept': '',
  'Content-Type': ''
}

export const EmptyAcceptJsonHeader: any = {
  'Accept': '',
  'Content-Type': 'application/json'
}

export const InValidAcceptJsonHeader: any = {
  'Accept': 'invalid/json',
  'Content-Type': 'application/json'
}

export function authorizationHeader (token: string): any {
  return {
    authorization: 'Bearer ' + token
  }
}
