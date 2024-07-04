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

import { IncomingMessage } from 'http'

export function isString(value: any): value is string {
  return typeof value === 'string'
}

export function isNonEmptyString(value: any): value is string {
  return isString(value) && value.length > 0
}

export function isNumber(value: any): value is number {
  return typeof value === 'number'
}

export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Returns a new object with empty/null/undefined values removed from the passed object
 * @param o - object with keys as string
 */
export function removeEmptyValuesFromObj(o: { [index: string]: any }): { [index: string]: any } {
  const newObj: { [index: string]: any } = {}
  Object.keys(o).forEach((key) => {
    const val = o[key]
    if (typeof val !== 'undefined' && val !== null && val.length !== 0) {
      newObj[key] = o[key]
    }
  })
  return newObj
}

export function getManuscriptIDFromRequest(request: IncomingMessage): string {
  const url = request.url
  if (!url) {
    throw new Error('No URL found')
  }
  const manuscriptIDPattern = /(MPManuscript:[^/]+)/
  const match = url.match(manuscriptIDPattern)
  if (!match) {
    throw new Error('No manuscriptID in URL')
  }
  return match[1]
}
