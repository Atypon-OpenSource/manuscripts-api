/*!
 * © 2023 Atypon Systems LLC
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

const localesPath = __dirname + '/../../../../dist/config/csl/locales/'
const sharedPath = __dirname + '/../../../../dist/config/shared/'
const stylesPath = __dirname + '/../../../../dist/config/csl/styles/'

export class ConfigController extends BaseController {
  private async getData(path: string, fileName?: string, ids?: string[] | string) {
    if (fileName) {
      fileName = fileName.endsWith('.json') ? fileName : fileName + '.json'
      return await DIContainer.sharedContainer.configService.loadConfigData(path, fileName, ids)
    }
    return await DIContainer.sharedContainer.configService.loadConfigData(path)
  }

  async getSharedData(fileName?: string, ids?: any) {
    return this.getData(sharedPath, fileName, ids)
  }

  async getLocales(fileName?: string) {
    return this.getData(localesPath, fileName)
  }

  async getStyles(fileName?: string) {
    return this.getData(stylesPath, fileName)
  }
}
