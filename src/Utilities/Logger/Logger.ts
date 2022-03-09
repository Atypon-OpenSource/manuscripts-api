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

import { WinstonLogger } from './Winston'

const sharedLogger = new WinstonLogger()

class Logger {
  /**
   * Logs information data.
   */
  public info(msg: string, meta?: any): void {
    sharedLogger.info(msg, meta)
  }

  /**
   * Logs errors.
   */
  public error(msg: string, meta?: any): void {
    sharedLogger.error(msg, meta)
  }

  /**
   * Logs debug data
   */
  public debug(msg: string, meta?: any): void {
    sharedLogger.debug(msg, meta)
  }
}

export const log = new Logger()
