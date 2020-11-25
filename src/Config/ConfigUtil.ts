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

import { ValidationError } from '../Errors'

/**
 * Returns a map of key/value pairs from the passed config string.
 * Expects each key/value pair to be separated by `outerSeparator` and the "key" and "value" to be separated by
 * `innerSeparator`. For eg. for input string - "a1:b1;a2:b2" with outerSeparator as ";" and innerSeparator as ":",
 * it will return a map containing "a1" and "a2" as keys and "b1" and "b2" as corresponding values.
 * @param configStr - input string
 * @param innerSeparator - marker that separates the key/value pairs
 * @param outerSeparator - marker that separates key and the value
 */
export function getMap (configStr: string, innerSeparator: string, outerSeparator: string): Map<string, string> {
  let map = new Map()
  configStr.split(outerSeparator).map(x => {
    const configParts = x.split(innerSeparator)
    if (configParts.length !== 2) {
      throw new ValidationError('Expected two values in the config', configParts)
    }
    map.set(configParts[0], configParts[1])
  })
  return map
}
