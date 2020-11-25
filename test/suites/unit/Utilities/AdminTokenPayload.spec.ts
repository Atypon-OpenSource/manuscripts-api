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

import { isAdminTokenPayload } from '../../../../src/Utilities/JWT/AdminTokenPayload'

describe('AdminTokenPayload', () => {
  test('ensures that the isAdminTokenPayload type guard behaves correctly', () => {
    const nullToken = null
    const stringToken = 'foo'
    const invalidObjTokenA: any = { connectUserID: 2 }
    const invalidObjTokenB: any = { email: 3 }
    const invalidObjTokenD = { }
    const validToken = { connectUserID: 'foo' }

    expect(isAdminTokenPayload(nullToken)).toBeFalsy()
    expect(isAdminTokenPayload(stringToken)).toBeFalsy()
    expect(isAdminTokenPayload(invalidObjTokenA)).toBeFalsy()
    expect(isAdminTokenPayload(invalidObjTokenB)).toBeFalsy()
    expect(isAdminTokenPayload(invalidObjTokenD)).toBeFalsy()
    expect(isAdminTokenPayload(validToken)).toBeTruthy()
  })
})
