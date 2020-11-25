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

import * as winston from 'winston'

import { Environment } from '../../../Config/ConfigurationTypes'
import { ILogger } from '../ILogger'

export class WinstonLogger implements ILogger {
  /**
   * winston logger
   */
  private logger: winston.LoggerInstance

  constructor () {
    this.configure()
  }

  /**
   * Configures winston.
   */
  public configure (): void {
    this.logger = new winston.Logger()

    this.logger.add(winston.transports.Console, {
      level: 'debug',
      showLevel: true,
      // exceptionsLevel: ["info"],
      colorize: process.env.NODE_ENV === Environment.Development
      // json: true,
      // maxsize: 5242880, // 5MB
      // maxFiles: 5
    })

    this.logger.add(winston.transports.File, {
      name: 'info-file',
      filename: '.logs/info.log',
      level: 'info',

      json: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })

    this.logger.add(winston.transports.File, {
      name: 'info-error',
      filename: '.logs/error.log',
      level: 'error',

      json: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      levelOnly: true
    })

    this.logger.add(winston.transports.File, {
      name: 'info-debug',
      filename: '.logs/debug.log',
      level: 'debug',

      json: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  }

  /**
   * Logs information data.
   */
  info (msg: string, meta: any): void {
    this.logger.info(msg, meta)
  }

  /**
   * Logs errors.
   */
  error (msg: string, meta: any): void {
    this.logger.error(msg, meta)
  }

  /**
   * Logs debug data
   */
  debug (msg: string, meta: any): void {
    // disable debug if node env is production, or force log debug data flag is set 1
    if (process.env.FORCE_DEBUG === '1') {
      this.logger.debug(msg, meta)
    } else if (
      process.env.NODE_ENV === Environment.Production
    ) {
      // nothing to do.
    } else {
      this.logger.debug(msg, meta)
    }
  }
}
