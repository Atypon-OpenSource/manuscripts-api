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

import { Request } from 'express'

import { ValidationError } from './Errors'

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

export function validateRequestParams(req: Request, params: string | string[]) {
  const paramNames = Array.isArray(params) ? params : [params]

  for (const paramName of paramNames) {
    const paramValue = req.params[paramName]
    if (!paramValue) {
      throw new ValidationError(`${paramName} parameter must be specified`, paramValue)
    }
  }
}

interface Param<T> {
  name: string
  value: T
  type: string
}

export function validateParamsType<T>(...params: Param<T>[]) {
  for (const { name, value, type } of params) {
    if (typeof value !== type) {
      throw new ValidationError(`${name} should be ${type}`, value)
    }
  }
}
