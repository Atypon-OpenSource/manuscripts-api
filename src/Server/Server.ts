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

import cors from 'cors'
import express from 'express'
import promBundle from 'express-prom-bundle'
import logger from 'morgan'
import * as path from 'path'
import { WebSocketServer } from 'ws'

import { PassportAuth } from '../Auth/Passport/Passport'
import { config } from '../Config/Config'
import { Environment } from '../Config/ConfigurationTypes'
import { initRouter } from '../Controller/InitRouter'
import { getRoutes as getRoutesV2 } from '../Controller/V2/Routes'
import { DIContainer } from '../DIContainer/DIContainer'
import { ForbiddenOriginError, IllegalStateError, isStatusCoded } from '../Errors'
import generateDocs from '../Utilities/Docs/swagger'
import { log } from '../Utilities/Logger'
import { IServer } from './IServer'
import { configurePromClientRegistry } from './PromClientRegistryConfig'

/**
 * The server.
 *
 * @class Server
 */
export class Server implements IServer {
  public app: express.Application
  private webSocketServer: WebSocketServer

  public bootstrap(): void {
    this.app = express()
    this.config()
    this.loadRoutes()
    this.initWebSocketServer()
  }

  private config() {
    this.app.use(express.static(path.join(__dirname, '../../public')))

    if (this.app.get('env') !== 'test') {
      this.app.use(logger('dev')) // short
    }

    const allowedOrigins: string[] = []

    for (const allowedOrigin of config.server.allowedCORSOrigins) {
      allowedOrigins.push(allowedOrigin)
    }

    const originWildcard = allowedOrigins.indexOf('*') >= 0

    if (process.env.NODE_ENV === Environment.Production && originWildcard) {
      throw new IllegalStateError(
        'Attempting to execute in production mode with "APP_ALLOWED_CORS_ORIGINS" including "*". You probably didn\'t want to do this?',
        'APP_ALLOWED_CORS_ORIGINS=*'
      )
    }

    this.app.use(
      cors({
        origin: (requestOrigin, callback) => {
          // when request came from the same domain, requestOrigin === undefined.
          if (!requestOrigin) {
            return callback(null, true)
          }
          if (process.env.NODE_ENV === Environment.Development && originWildcard) {
            return callback(null, true)
          }
          if (allowedOrigins.indexOf(requestOrigin) >= 0) {
            return callback(null, true)
          } else {
            return callback(new ForbiddenOriginError(requestOrigin))
          }
        },
        credentials: true,
      })
    )

    this.app.use(express.json({ limit: '50mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }))

    const metricsMiddleware = promBundle({ promClient: { collectDefaultMetrics: {} } })
    this.app.use(metricsMiddleware)
    configurePromClientRegistry()

    PassportAuth.init(this.app)
  }

  private loadRoutes() {
    const routerV2 = initRouter(getRoutesV2())
    generateDocs(this.app)

    // use router middleware
    this.app.use('/api/v2', routerV2)
    this.app.get('/', (_req, res: express.Response) => {
      return res.redirect('/api/v2/app/version')
    })

    // catch any error and forward to error handler
    // eslint-disable-next-line @typescript-eslint/ban-types
    this.app.use((req: express.Request, res: express.Response, _next: Function) => {
      if (process.env.NODE_ENV !== 'test') {
        log.error(
          `The requested endpoint (${req.method} ${req.url}) doesn't exist. Status code: 404`
        )
      }
      res.status(404).json({}).end()
    })

    // catch any error and forward to error handler
    // eslint-disable-next-line @typescript-eslint/ban-types
    this.app.use((error: Error, req: express.Request, res: express.Response, _next: Function) => {
      const statusCode = isStatusCoded(error) ? error.statusCode : 400
      if (process.env.NODE_ENV !== 'test') {
        log.error(`${req.method} ${req.url} (${statusCode}):`, error)
      }

      res
        .status(statusCode)
        .json({ error: JSON.stringify(error), message: error.message })
        .end()
    })
  }

  private initWebSocketServer() {
    this.webSocketServer = new WebSocketServer({ noServer: true })
  }

  /**
   * Starts web server on specific port.
   */
  public async start(port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const server = this.app
        .listen(port, () => {
          log.info(`Server started on port ${port}`)
          resolve()
        })
        .on('error', (error: Error) => {
          log.error(`can't start server`, error)
          reject(error)
        })

      if (process.env.NODE_ENV === 'development') {
        server.on('upgrade', (req, socket, head) =>
          DIContainer.sharedContainer.documentService.handleUpgrade(
            this.webSocketServer,
            req,
            socket,
            head
          )
        )
      }
    })
  }
}
