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

import {
  isBoolean,
  isNonEmptyString,
  isNumber,
  isString,
  removeEmptyValuesFromObj,
} from '../../../src/util'
describe('utils', () => {
  describe('removeEmptyValuesFromObj', () => {
    test('should remove key with undefined value in object', () => {
      const obj = {
        key1: undefined,
        key2: 'foo',
      }
      const newObj = removeEmptyValuesFromObj(obj)
      expect('key1' in newObj).toBe(false)
    })

    test('should remove key with null value in object', () => {
      const obj = {
        key1: null,
        key2: 'foo',
      }
      const newObj = removeEmptyValuesFromObj(obj)
      expect('key1' in newObj).toBe(false)
    })

    test('should remove key with empty value in object', () => {
      const obj = {
        key1: '',
        key2: 'foo',
      }
      const newObj = removeEmptyValuesFromObj(obj)
      expect('key1' in newObj).toBe(false)
    })

    test('should preserve key with non-empty value in object', () => {
      const obj = {
        key1: null,
        key2: 'foo',
      }
      const newObj = removeEmptyValuesFromObj(obj)
      expect(newObj['key2']).toBe('foo')
    })
  })
  describe('isString', () => {
    it('should return true for a string value', () => {
      const value = 'Hello, World!'

      const result = isString(value)

      expect(result).toBe(true)
    })

    it('should return false for a non-string value', () => {
      const value = 42

      const result = isString(value)

      expect(result).toBe(false)
    })

    it('should return false for undefined', () => {
      const value = undefined

      const result = isString(value)

      expect(result).toBe(false)
    })

    it('should return false for null', () => {
      const value = null

      const result = isString(value)

      expect(result).toBe(false)
    })

    it('should return false for an object', () => {
      const value = { name: 'Mohammad', age: 23 }

      const result = isString(value)

      expect(result).toBe(false)
    })

    it('should return false for an array', () => {
      const value = [1, 2, 3]

      const result = isString(value)

      expect(result).toBe(false)
    })
  })
  describe('isNonEmptyString', () => {
    it('should return true for a non-empty string value', () => {
      const value = 'Hello, World!'
      const result = isNonEmptyString(value)
      expect(result).toBe(true)
    })

    it('should return false for an empty string', () => {
      const value = ''
      const result = isNonEmptyString(value)
      expect(result).toBe(false)
    })

    it('should return false for a non-string value', () => {
      const value = 42
      const result = isNonEmptyString(value)
      expect(result).toBe(false)
    })

    it('should return false for undefined', () => {
      const value = undefined
      const result = isNonEmptyString(value)
      expect(result).toBe(false)
    })

    it('should return false for null', () => {
      const value = null
      const result = isNonEmptyString(value)
      expect(result).toBe(false)
    })

    it('should return false for an object', () => {
      const value = { name: 'Mohammad', age: 23 }
      const result = isNonEmptyString(value)
      expect(result).toBe(false)
    })

    it('should return false for an array', () => {
      const value = [1, 2, 3]
      const result = isNonEmptyString(value)
      expect(result).toBe(false)
    })
  })

  describe('isNumber', () => {
    it('should return true for a number value', () => {
      const value = 42
      const result = isNumber(value)
      expect(result).toBe(true)
    })

    it('should return false for a non-number value', () => {
      const value = 'Hello, World!'
      const result = isNumber(value)
      expect(result).toBe(false)
    })

    it('should return false for undefined', () => {
      const value = undefined
      const result = isNumber(value)
      expect(result).toBe(false)
    })

    it('should return false for null', () => {
      const value = null
      const result = isNumber(value)
      expect(result).toBe(false)
    })

    it('should return false for an object', () => {
      const value = { name: 'Mohammad', age: 23 }
      const result = isNumber(value)
      expect(result).toBe(false)
    })

    it('should return false for an array', () => {
      const value = [1, 2, 3]
      const result = isNumber(value)
      expect(result).toBe(false)
    })
  })
  describe('isBoolean', () => {
    it('should return true for a boolean value', () => {
      const value = true
      const result = isBoolean(value)
      expect(result).toBe(true)
    })

    it('should return false for a non-boolean value', () => {
      const value = 'Hello, World!'
      const result = isBoolean(value)
      expect(result).toBe(false)
    })

    it('should return false for undefined', () => {
      const value = undefined
      const result = isBoolean(value)
      expect(result).toBe(false)
    })

    it('should return false for null', () => {
      const value = null
      const result = isBoolean(value)
      expect(result).toBe(false)
    })

    it('should return false for an object', () => {
      const value = { name: 'Mohammad', age: 23 }
      const result = isBoolean(value)
      expect(result).toBe(false)
    })

    it('should return false for an array', () => {
      const value = [1, 2, 3]
      const result = isBoolean(value)
      expect(result).toBe(false)
    })
  })
})
