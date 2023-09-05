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

import { createLogger, format, Logger, transports } from 'winston'

import { Environment } from '../../../Config/ConfigurationTypes'
import { ILogger } from '../ILogger'

export class WinstonLogger implements ILogger {
  /**
   * winston logger
   */
  private logger: Logger

  constructor() {
    this.configure()
  }

  /**
   * Configures winston.
   */
  public configure(): void {
    this.logger = createLogger()

    this.logger.add(
      new transports.Console({
        level: 'debug',
      })
    )

    this.logger.add(
      new transports.File({
        filename: '.logs/info.log',
        level: 'info',
        format: format.json(),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    )
  }

  /**
   * Logs information data.
   */
  info(msg: string, meta: any): void {
    this.logger.info(msg, meta)
  }

  /**
   * Logs errors.
   */
  error(msg: string, meta: any): void {
    this.logger.error(msg, meta)
  }

  /**
   * Logs debug data
   */
  debug(msg: string, meta: any): void {
    // disable debug if node env is production, or force log debug data flag is set 1
    if (process.env.FORCE_DEBUG === '1') {
      this.logger.debug(msg, meta)
    } else if (process.env.NODE_ENV === Environment.Production) {
      // nothing to do.
    } else {
      this.logger.debug(msg, meta)
    }
  }
}
