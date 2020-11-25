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

import { isBearerHeaderValue } from '../../../../src/Controller/BaseController'

describe('BaseRController - isBearerHeaderValue', () => {
  test('should do basic validity checking with isBearerHeaderValue(…)', async () => {
    expect(isBearerHeaderValue(undefined)).toBeFalsy()
    expect(isBearerHeaderValue(1234 as any)).toBeFalsy()
    expect(isBearerHeaderValue('')).toBeFalsy()
    expect(isBearerHeaderValue(['herp', 'derp'])).toBeFalsy()
    expect(isBearerHeaderValue('Bearer derp')).toBeTruthy()
  })
})
