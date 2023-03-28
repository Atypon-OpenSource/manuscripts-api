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
  removeEmptyValuesFromObj,
  validateParamsType,
  validateRequestParams,
} from '../../../src/util'

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

describe('validateRequestParams', () => {
  test('should throw an error if the parameter is not specified', () => {
    const req = {
      params: {},
    }

    expect(() => {
      // @ts-ignore
      validateRequestParams(req, 'id')
    }).toThrow('id parameter must be specified')
  })

  test('should not throw an error if the parameter is specified', () => {
    const req = {
      params: {
        id: '123',
      },
    }
    // @ts-ignore

    expect(() => {
      // @ts-ignore
      validateRequestParams(req, 'id')
    }).not.toThrow()
  })

  test('should not throw an error if multiple parameters are specified', () => {
    const req = {
      params: {
        id: '123',
        name: 'John',
      },
    }
    expect(() => {
      // @ts-ignore
      validateRequestParams(req, ['id', 'name'])
    }).not.toThrow()
  })
})

describe('validateParamsType', () => {
  test('should throw an error if the parameter has an incorrect type', () => {
    expect(() => {
      validateParamsType({ name: 'id', value: '123', type: 'number' })
    }).toThrow('id should be number')
  })

  test('should not throw an error if the parameter has a correct type', () => {
    expect(() => {
      validateParamsType({ name: 'id', value: 123, type: 'number' })
    }).not.toThrow()
  })
})
