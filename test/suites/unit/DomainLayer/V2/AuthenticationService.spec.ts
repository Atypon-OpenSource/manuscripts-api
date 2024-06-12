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

import '../../../../utilities/configMock'
import '../../../../utilities/dbMock'

import { describe } from 'jest-circus'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { AuthenticationService } from '../../../../../src/DomainServices/AuthenticationService'
import { AccountNotFoundError } from '../../../../../src/Errors'
import { UserClient } from '../../../../../src/Models/RepositoryModels'
import { generateUserToken } from '../../../../../src/Utilities/JWT/LoginTokenPayload'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})
jest.mock('../../../../../src/Utilities/JWT/LoginTokenPayload')

describe('AuthenticationService', () => {
  let authenticationService: AuthenticationService
  let userClient: UserClient

  beforeEach(() => {
    authenticationService = DIContainer.sharedContainer.authenticationService
    userClient = DIContainer.sharedContainer.userClient
  })

  it('should return a token for valid credentials', async () => {
    const mockUser = { id: '123', email: 'test@example.com' }
    userClient.findByConnectID = jest.fn().mockResolvedValue(mockUser)
    //@ts-ignore
    generateUserToken.mockReturnValue('mockToken')

    const credentials = { deviceID: 'device123', connectUserID: 'user123' }
    const token = await authenticationService.serverToServerTokenAuth(credentials)

    expect(token).toEqual('mockToken')
    expect(userClient.findByConnectID).toHaveBeenCalledWith('user123')
    expect(generateUserToken).toHaveBeenCalledWith({
      email: mockUser.email,
      id: mockUser.id,
      deviceID: 'device123',
    })
  })

  it('should throw AccountNotFoundError for invalid credentials', async () => {
    userClient.findByConnectID = jest.fn().mockResolvedValue(null)

    const credentials = { deviceID: 'device123', connectUserID: 'invalidUser' }

    await expect(authenticationService.serverToServerTokenAuth(credentials)).rejects.toThrow(
      AccountNotFoundError
    )
  })
})
