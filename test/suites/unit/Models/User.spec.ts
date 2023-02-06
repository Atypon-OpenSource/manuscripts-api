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

import { userForRow } from '../../../../src/Models/UserModels'
import { deletdUserRowData, userRowData } from '../../../data/fixtures/userRowData'

describe('User Model', () => {
  test('should create model from row', () => {
    const user = userForRow(userRowData)
    expect(user.email).toBe(userRowData.email)
    expect(user._id).toBe(userRowData.id)
    expect(user.name).toBe(userRowData.name)
  })

  test('should create model from deleted user row', () => {
    const user = userForRow(deletdUserRowData)
    expect(user.deleteAt).toBe(deletdUserRowData.deleteAt)
  })
})
