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

import { DIContainer } from '../../../DIContainer/DIContainer'
import { BaseController } from '../../BaseController'

export class RegistrationController extends BaseController {
  async connectSignup(email: string, name: string, connectUserID: string): Promise<void> {
    const credentials = {
      connectUserID,
      name,
      email: email.toLowerCase(),
      isVerified: false,
      createdAt: new Date().getTime(),
    }
    await DIContainer.sharedContainer.registerationService.connectSignup(credentials)
  }
}
