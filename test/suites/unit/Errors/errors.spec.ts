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

import * as Errors from '../../../../src/Errors'

describe('SyncError', () => {
  test('should be representable sensibly in JSON', () => {
    const e = new Errors.SyncError('Foo', { bar: 1 })
    expect(e.name).toEqual('SyncError')
  })

  test('All known error types have a more specific "name"', () => {
    const errors = Object.values(Errors).filter((e: any) => {
      return typeof e !== 'function'
    })

    // Expecting the 'name' field to have been overridden with '…Error'.
    expect(errors.every((e) => e.name !== 'Error' && e.name.match(/Error$/) !== null)).toBeTruthy()
  })
})
