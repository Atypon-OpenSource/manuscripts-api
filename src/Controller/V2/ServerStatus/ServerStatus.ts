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

import { IllegalStateError } from '../../../Errors'
import { isString } from '../../../util'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pjson = require('../../../../package.json')

export class ServerStatus {
  static get version(): string {
    /* istanbul ignore if */
    if (!isString(pjson.version)) {
      throw new IllegalStateError('App version is unexpectedly not a string', pjson.version)
    }
    return pjson.version
  }
}
