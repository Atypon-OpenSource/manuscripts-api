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

import { AuthorizedUser, userForRow } from '../../../../src/Models/UserModels'
import { authorizedUserRowData } from '../../../data/fixtures/authorizedUserRowData'
import { userRowData } from '../../../data/fixtures/userRowData'

describe('Authorized User Model', () => {
  test('should create model', () => {
    const user = userForRow(userRowData)
    const authorizedUser: AuthorizedUser = {
      token: authorizedUserRowData.token,
      user: user,
    }
    expect(authorizedUser).toMatchSnapshot()
  })
})
