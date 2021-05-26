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

import { errors } from 'couchbase'
import { databaseErrorMessage } from '../../../../src/DataAccess/DatabaseResponseFunctions'

describe('databaseErrorMessage', () => {
  test('should return a meaningful error for "key already exists"', () => {
    expect(databaseErrorMessage(errors.keyAlreadyExists, null)).toMatch(/Document id/)
    expect(databaseErrorMessage(errors.keyNotFound, null)).toMatch(/doesn't exist/)
  })

  test('should return the default message for an unknown error', () => {
    const unknownErrorCode = 123456789
    const errorMsg = databaseErrorMessage(unknownErrorCode, null)
    expect(errorMsg).toBe(`General Couchbase error (code ${unknownErrorCode}).`)

    // FIXME: This is silly. Should be a separate constructor for the "general" case, which would take the message arg that is otherwise ignored.
    expect(databaseErrorMessage(123456789, 'Custom message that may ignore the input')).toEqual('Custom message that may ignore the input')
  })
})
