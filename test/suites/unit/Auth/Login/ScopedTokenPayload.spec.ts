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

import { isScopedTokenPayload } from '../../../../../src/Utilities/JWT/ScopedTokenPayload'

describe('Login', () => {

  test('ensures that the isScopedTokenPayload type guard behaves correctly', () => {
    const nullToken = null
    const validToken = {
      aud: 'john',
      containerID: 'MPProject:valid-project-id',
      sub: 'foo',
      exp: ((new Date()).getTime() / 1000) + 100000, // safely in the future, in seconds.
      iat: ((new Date()).getTime() / 1000) - 100000, // safely in the past, in seconds.
      iss: 'atypon.com'
    }
    expect(isScopedTokenPayload(nullToken)).toBeFalsy()
    expect(isScopedTokenPayload(validToken)).toBeTruthy()
  })
})
