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

import { SyncService } from '../../../../../../src/DomainServices/Sync/SyncService'
import { SyncError, GatewayInaccessibleError } from '../../../../../../src/Errors'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

jest.mock('request-promise-native')
const request = require('request-promise-native')

xdescribe('SyncService', () => {
  test('should fail if the sync_gateway not working', () => {
    request.mockImplementation(() => ({ statusCode: 400 }))
    return expect(SyncService.isAlive()).rejects.toThrowError(SyncError)
  })

  test('should fail if the sync_gateway inAccessible', () => {
    request.mockImplementation(() => Promise.reject(new GatewayInaccessibleError('Fake induced fail.')))
    return expect(SyncService.isAlive()).rejects.toThrowError(GatewayInaccessibleError)
  })
})
