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

// tslint:disable:member-ordering
import methodOverride from 'method-override'
import * as bodyParser from 'body-parser'
import express from 'express'
import cors from 'cors'
import logger from 'morgan'
import * as path from 'path'

import { log } from '../Utilities/Logger'
import { IServer } from './IServer'
import { PassportAuth } from '../Auth/Passport/Passport'
import { loadRoutes } from '../Controller/RouteLoader'
import { Database } from '../DataAccess/Database'
import { isStatusCoded, ForbiddenOriginError, IllegalStateError } from '../Errors'
import { config } from '../Config/Config'
import { SyncService } from '../DomainServices/Sync/SyncService'
import { DIContainer } from '../DIContainer/DIContainer'
import { Environment } from '../Config/ConfigurationTypes'

/**
 * The server.
 *
 * @class Server
 */
export class Server implements IServer {
  public app: express.Application

  constructor (public database: Database) {}

  /**
   * Validates that essential components necessary for the application are up and healthy
   */
  public async checkPrerequisites () {
    return Promise.all([
      DIContainer.sharedContainer.userBucket.isViewServiceAlive(),
      SyncService.isAlive()
    ])
  }

  public bootstrap (): void {
    this.app = express()
    this.config()
    this.loadRoutes()
  }

  private config () {
    this.app.use(express.static(path.join(__dirname, '../../public')))

    if (this.app.get('env') !== 'test') {
      this.app.use(logger('dev')) // short
    }

    // use json form parser middleware
    this.app.use(bodyParser.json())

    const allowedOrigins: string[] = []

    for (const allowedOrigin of config.server.allowedCORSOrigins) {
      allowedOrigins.push(allowedOrigin)
    }

    const originWildcard = allowedOrigins.indexOf('*') >= 0

    if (process.env.NODE_ENV === Environment.Production && originWildcard) {
      throw new IllegalStateError('Attempting to execute in production mode with "APP_ALLOWED_CORS_ORIGINS" including "*". You probably didn\'t want to do this?', 'APP_ALLOWED_CORS_ORIGINS=*')
    }

    this.app.use(cors({
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
      credentials: true
    }))

    // use query string parser middleware
    this.app.use(
      bodyParser.urlencoded({
        extended: true
      })
    )

    this.app.use(methodOverride())

    PassportAuth.init(this.app)
  }

  private loadRoutes () {
    const router: express.Router = express.Router()

    loadRoutes(router)

    // use router middleware
    this.app.use('/api/v1', router)

    this.app.get('/', (_req, res: express.Response) => {
      return res.redirect('/api/v1/app/version')
    })

    this.app.get(`/.well-known/jwks.json`, (_req: express.Request, res: express.Response) => {
      const keys = config.scopes.map((s) => ({ ...s.publicKeyJWK, kid: s.identifier }))
      res.send({ keys })
    })

    // catch any error and forward to error handler
    this.app.use(
      (req: express.Request, res: express.Response, _next: Function) => {
        if (process.env.NODE_ENV !== 'test') {
          log.error(`The requested endpoint (${req.method} ${req.url}) doesn't exist. Status code: 404`)
        }
        res.status(404)
           .json({})
           .end()
      }
    )

    // catch any error and forward to error handler
    this.app.use(
      (
        error: Error,
        req: express.Request,
        res: express.Response,
        _next: Function
      ) => {
        const statusCode = isStatusCoded(error) ? error.statusCode : 400
        if (process.env.NODE_ENV !== 'test') {
          log.error(`${req.method} ${req.url} (${statusCode}):`, error)
        }

        res.status(statusCode)
           .json({ error: JSON.stringify(error), message: error.message })
           .end()
      }
    )
  }

  /**
   * Starts web server on specific port.
   */
  public async start (port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.app.listen(port, (error: Error) => {
        if (error) {
          log.error(`can't start server`, error)
          reject(error)
        } else {
          log.info(`Server started on port ${port}`)
          resolve()
        }
      })
    })
  }
}
