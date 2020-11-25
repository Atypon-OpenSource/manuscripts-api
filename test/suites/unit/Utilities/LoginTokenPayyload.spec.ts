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

import { isLoginTokenPayload } from '../../../../src/Utilities/JWT/LoginTokenPayload'

describe('LoginTokenPayyload', () => {
  test('ensures that the isLoginTokenPayload type guard behaves correctly', () => {
    const nullToken = null
    const stringToken = 'foo'
    const invalidObjTokenA = { tokenId: 2, userId: 'foo', appId: 'bar' }
    const invalidObjTokenB = { tokenId: 'foo', userId: 3, appId: 'bar' }
    const invalidObjTokenC = { tokenId: 'foo', userId: 'bar', appId: 4 }
    const invalidObjTokenD = { }
    const validToken = { tokenId: 'foo', userId: 'bar', appId: 'foobar' }

    expect(isLoginTokenPayload(nullToken)).toBeFalsy()
    expect(isLoginTokenPayload(stringToken)).toBeFalsy()
    expect(isLoginTokenPayload(invalidObjTokenA)).toBeFalsy()
    expect(isLoginTokenPayload(invalidObjTokenB)).toBeFalsy()
    expect(isLoginTokenPayload(invalidObjTokenC)).toBeFalsy()
    expect(isLoginTokenPayload(invalidObjTokenD)).toBeFalsy()
    expect(isLoginTokenPayload(validToken)).toBeTruthy()
  })
})
