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

import * as _ from 'lodash'
import { ValidationError } from '../Errors'
import moment from 'moment'

export function required (val: string | number, fieldName: string) {
  if (_.isEmpty(val.toString()) || _.isEmpty(val.toString().trim())) {
    throw new ValidationError(`${fieldName} can't be null, empty, undefined or white spaces.`, val)
  }
}

const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

export function validEmail (val: string, fieldName: string) {
  if (!EMAIL_REGEX.test(val)) {
    throw new ValidationError(`${fieldName} should be in valid email format.`, val)
  }
}

export function maxLength (val: string, length: number, fieldName: string) {
  if (_.size(val) > length) {
    throw new ValidationError(`${fieldName} length should be less than ${length}.`, val)
  }
}

export function date (val: Date, fieldName: string) {
  if (!moment(val).isValid()) {
    throw new ValidationError(`${fieldName} date should be valid.`,moment(val).format('DD/MM/YYYY'))
  }
}

export function stringValuedObject (val: object, fieldName: string) {
  if (!_.isPlainObject(val) || !_.values(val).every(_.isString)) {
    throw new ValidationError(`${val} should be a plain object and its key ${fieldName} should have a string as value.`, val)
  }
}

export function arrayValuedObject (val: object, fieldName: string) {
  if (!_.isPlainObject(val) || !_.values(val).every(_.isArray)) {
    throw new ValidationError(`${val} should be a plain object and its key ${fieldName} should have an array as value.`, val)
  }
}

export function objectValuedObject (val: object, fieldName: string) {
  if (!_.isPlainObject(val) || !_.values(val).every(_.isObject)) {
    throw new ValidationError(`${val} should be a plain object and its key ${fieldName} should have an object as value.`, val)
  }
}

export function stringValuedNestedObject (val: object, fieldName: string) {
  if (_.isPlainObject(val)) {
    for (const obj of _.values(val)) {
      if (!_.isPlainObject(obj) || !_.values(obj).every(_.isString)) {
        throw new ValidationError(`${fieldName} object should be a plain object with strings as values.`, obj)
      }
    }
  } else {
    throw new ValidationError(`${fieldName} object should be a plain object.`, val)
  }
}

export function plainObject (val: object, fieldName: string) {
  if (!_.isPlainObject(val)) {
    throw new ValidationError(`${fieldName} should be plain object.`, val)
  }
}
