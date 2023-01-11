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

import { getMap } from '../../../src/Config/ConfigUtil'
import { normalizeURL } from '../../../src/Config/normalize-url'
import { ValidationError } from '../../../src/Errors'

describe('normalizeURL', () => {
  test('should normalize away trailing slashes', () => {
    expect(normalizeURL('https://community.manuscripts.io/'))
        .toEqual('https://community.manuscripts.io')
  })

  test('should not modify a URL that does not have a trailing slash', () => {
    expect(normalizeURL('https://community.manuscripts.io'))
        .toEqual('https://community.manuscripts.io')
  })

})

describe('getMap utility', () => {
  test('should create a valid map from a valid input string', () => {
    const input = 'key1:value1;key2:value2'
    const map = getMap(input, ':', ';')
    expect(map.size).toBe(2)
    expect(map.get('key1')).toBe('value1')
    expect(map.get('key2')).toBe('value2')
  })

  test('should throw validation error for wrong outer separator)', () => {
    return expect(() => {
      const input = 'key1:value1;key2:value2'
      getMap(input, ':', ':')
    }).toThrow(ValidationError)
  })

  test('should throw validation error for wrong inner separator', () => {
    return expect(() => {
      const input = 'key1:value1;key2:value2'
      getMap(input, ';', ';')
    }).toThrow(ValidationError)
  })

  test('should throw validation error for an invalid input', () => {
    return expect(() => {
      const invalidInput = 'key1?value1;key2)value2'
      getMap(invalidInput, ':', ';')
    }).toThrow(ValidationError)
  })
})
