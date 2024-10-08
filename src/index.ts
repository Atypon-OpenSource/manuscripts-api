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

import { defineGlobals } from './define-globals'
defineGlobals()

import { schedule } from 'node-cron'

import { config } from './Config/Config'
import { ServerStatus } from './Controller/V2/ServerStatus/ServerStatus'
import { DIContainer } from './DIContainer/DIContainer'
import { log } from './Utilities/Logger'

process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled rejection – reason: ${reason}, promise: ${promise}`)
})

function main() {
  log.debug('Initializing Manuscripts.io container…')
  DIContainer.init()
    .then(async () => {
      const container = DIContainer.sharedContainer
      container.server.bootstrap()
      return container.server.start(config.API.port)
    })
    // eslint-disable-next-line promise/always-return
    .then(() => {
      log.info(`Manuscripts.io ${ServerStatus.version} started 🚀`)
    })

    // eslint-disable-next-line promise/always-return
    .then(() => {
      schedule('* * 1 * *', async (date) => {
        if (date instanceof Date) {
          log.info('Deleting 30 day old backups')
          await DIContainer.sharedContainer.documentService.deleteOldBackups(date)
        }
      })
    })
    .catch((error) => {
      log.error('An error occurred while bootstrapping app:', error)
      process.exit(-1)
    })
}

main()
