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

import 'source-map-support/register'
const cron = require('node-cron')

import { config } from './Config/Config'
import { log } from './Utilities/Logger'

import { DIContainer } from './DIContainer/DIContainer'
import { ServerStatus } from './Controller/V1/ServerStatus/ServerStatus'
import { SQLDatabase } from './DataAccess/SQLDatabase'
console.log('Hi')
process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled rejection – reason: ${reason}, promise: ${promise}`)
})

function main() {
  log.debug('Initializing Manuscripts.io container…')
  SQLDatabase.ensureDBExtensions()
    .then(() => {
      return DIContainer.init(true)
    })
    .catch((error) => {
      log.error(error)
      return DIContainer.init(true)
    })
    .then(async () => {
      const container = DIContainer.sharedContainer
      container.server.bootstrap()
      return container.server.start(config.API.port)
    })
    .then(() => {
      log.info(`Manuscripts.io ${ServerStatus.version} started 🚀`)
    })
    .then(() => {
      cron.schedule('0 1 * * *', async () => {
        log.debug('clearUsersData every day')
        await DIContainer.sharedContainer.userService.clearUsersData()
      })
      cron.schedule('0 1 * * *', async () => {
        log.debug('clearExpiredDocuments every day')
        await DIContainer.sharedContainer.expirationService.clearExpiredDocuments()
      })
    })
    .catch((error) => {
      log.error('An error occurred while bootstrapping app:', error)
      process.exit(-1)
    })
}

main()
