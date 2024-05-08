/*!
 * © 2024 Atypon Systems LLC
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

import { EventType, User } from '@prisma/client'

import { UserClient } from '../DataAccess/Repository'
import { DuplicateEmailError } from '../Errors'
import { ConnectSignupCredentials, NameParts } from '../Models/UserModels'
import { EventManager } from './EventService'

export class RegisterationService {
  constructor(
    private readonly userRepository: UserClient,
    private readonly EventManager: EventManager
  ) {}
  public async connectSignup(credentials: ConnectSignupCredentials): Promise<User> {
    const { email, connectUserID } = credentials
    let user = await this.userRepository.findByEmail(email)
    if (user) {
      await this.updateConnectUserID(user, connectUserID)
    } else {
      user = await this.createUser(credentials)
    }
    return user
  }
  private async updateConnectUserID(user: User, connectUserID: string) {
    if (user.connectUserID !== connectUserID) {
      await this.userRepository.updateConnectID(user.userID, connectUserID)
      this.EventManager.emit(EventType.UpdateConnectID, user.userID)
    } else {
      throw new DuplicateEmailError(user.email)
    }
  }
  private async createUser(credentials: ConnectSignupCredentials) {
    const { given, family } = this.splitName(credentials.name)
    const { connectUserID, email } = credentials
    const userPayload = {
      given,
      family,
      connectUserID,
      email,
    }
    const user = await this.userRepository.createUser(userPayload)
    this.EventManager.emit(EventType.Registration, user.userID)
    return user
  }
  private splitName(name: string): NameParts {
    const trimmedName = name.trim()
    const nameParts = trimmedName.split(' ')
    if (nameParts.length === 1) {
      return { given: nameParts[0], family: '' }
    } else {
      return { given: nameParts[0], family: nameParts[nameParts.length - 1] }
    }
  }
}
