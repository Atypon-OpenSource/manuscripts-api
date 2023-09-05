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
  arrayValuedObject,
  date,
  maxLength,
  objectValuedObject,
  plainObject,
  required,
  stringValuedNestedObject,
  stringValuedObject,
  validEmail,
} from '../../../../src/DataAccess/validators'
import { ValidationError } from '../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

describe('validators', () => {
  test('required() should succeed for non-empty string', () => {
    expect(() => {
      required('foobar', 'field name')
    }).not.toThrow()
  })

  test('required() should succeed for non-empty number', () => {
    expect(() => {
      required(123456, 'filed name')
    }).not.toThrow()
  })

  test('required() should fail if value is empty', () => {
    expect(() => {
      required('', 'field name')
    }).toThrow(ValidationError)
  })

  test('required() should fail if value is whitespace alone', () => {
    expect(() => {
      required('  ', 'field name')
    }).toThrow(ValidationError)
  })

  test('validEmail() should fail if email is in invalid format', () => {
    expect(() => {
      validEmail('example@example', 'field name')
    }).toThrow(ValidationError)
  })

  test('validEmail() should pass if email is valid', () => {
    expect(() => {
      validEmail('example@example.com', 'field name')
    }).not.toThrow()
  })

  test('maxLength() should succeed if max length requirement is met', () => {
    expect(() => {
      maxLength('12345', 6, 'field name')
    }).not.toThrow()
  })

  test('maxLength() should fail if string length > 30', () => {
    expect(() => {
      maxLength('example-example-example-example-', 30, 'field name')
    }).toThrow(ValidationError)
  })

  test('date() should fail if date is not valid', () => {
    expect(() => {
      date(new Date(13123165465413123), 'field name')
    }).toThrow(ValidationError)
  })

  test('date() should succeed if date is valid', () => {
    expect(() => {
      date(new Date(1518426908709), 'field name')
    }).not.toThrow()
  })

  test('stringValuedObject() should succeed if object is valid', () => {
    expect(() => {
      stringValuedObject({ foo: 'potato', bar: 'carrot' }, 'field name')
    }).not.toThrow()
  })

  test('stringValuedObject() should succeed if object is empty', () => {
    stringValuedObject({}, 'field name')
  })

  test('stringValuedObject() should fail if object contains non string value', () => {
    expect(() => {
      stringValuedObject({ foo: 'potato', bar: 1 }, 'field name')
    }).toThrow(ValidationError)
  })

  test('stringValuedObject() should fail if object is null', () => {
    expect(() => {
      stringValuedObject(null as any, 'field name')
    }).toThrow(ValidationError)
  })

  test('stringValuedNestedObject() should succeed if object is valid', () => {
    expect(() => {
      stringValuedNestedObject({ google: { foo: 'potato', bar: 'carrot' } }, 'field name')
    }).not.toThrow()
  })

  test('stringValuedNestedObject() should fail if object contains non-string values', () => {
    expect(() => {
      stringValuedNestedObject({ google: { foo: 'potato', bar: 1 } }, 'field name')
    }).toThrow(ValidationError)
  })

  test('stringValuedNestedObject() should fail if object is null', () => {
    expect(() => {
      stringValuedNestedObject(null as any, 'field name')
    }).toThrow(ValidationError)
  })

  test('plainObject should fail if the value not an object', () => {
    expect(() => {
      plainObject('string' as any, 'fieldName')
    }).toThrow(ValidationError)
  })

  test('plainObject should not fail', () => {
    expect(() => {
      plainObject({ abc: 'xyz' }, 'fieldName')
    }).not.toThrow()
  })

  test('objectValuedObject should not fail', () => {
    expect(() => {
      objectValuedObject({ anotherObject: { value: 'xyz' } }, 'fieldName')
    }).not.toThrow()
  })

  test('objectValuedObject should fail', () => {
    expect(() => {
      objectValuedObject({ value: 'xyz' }, 'fieldName')
    }).toThrow(ValidationError)
  })

  test('arrayValuedObject should fail', () => {
    expect(() => {
      arrayValuedObject({ anotherObject: 'xyz' }, 'fieldName')
    }).toThrow(ValidationError)
  })

  test('arrayValuedObject should not fail', () => {
    expect(() => {
      arrayValuedObject({ value: ['xyz'] }, 'fieldName')
    }).not.toThrow()
  })
})
