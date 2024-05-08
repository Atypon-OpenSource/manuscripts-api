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

import { User } from '@prisma/client'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import passport from 'passport'

import { config } from '../../Config/Config'
import { APP_ID_HEADER_KEY, APP_SECRET_HEADER_KEY } from '../../Controller/V2/Auth/AuthController'
import {
  InvalidClientApplicationError,
  InvalidCredentialsError,
  InvalidJsonHeadersError,
  ValidationError,
} from '../../Errors'
import { isString } from '../../util'
import { ScopedJwtAuthStrategy } from './ScopedJWT'

export enum AuthStrategyTypes {
  scopedJwt = 'scopedJwt',
  jwt = 'jwt',
}

export class AuthStrategy {
  /**
   * Express authentication middleware.
   */
  public static JWTAuth(req: Request, res: Response, next: NextFunction) {
    passport.authenticate(AuthStrategyTypes.jwt, {}, (error: Error, user: User) => {
      AuthStrategy.userValidationCallback(error, user, req, res, next)
    })(req, res, next)
  }

  public static scopedJWTAuth(scopeName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const scope = config.scopes.find((s) => s.name === scopeName)
      if (!scope) {
        throw new ValidationError('scope not found', scopeName)
      }
      ScopedJwtAuthStrategy.use({ scope: scope })
      passport.authenticate(AuthStrategyTypes.scopedJwt, (error: Error, user: any) => {
        if (user && !error) {
          req.user = user
          return next()
        }
        return next(new InvalidCredentialsError('Invalid bt.'))
      })(req, res, next)
    }
  }

  /**
   * Returns anExpress Middleware function that reads application ID and application secret values from headers or query parameters, and validates them
   */
  public static applicationValidation() {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      let appID = req.headers[APP_ID_HEADER_KEY]
      let appSecret = req.headers[APP_SECRET_HEADER_KEY]

      if (!appID) {
        appID = req.query[APP_ID_HEADER_KEY] as string
        appSecret = req.query[APP_SECRET_HEADER_KEY] as string
      }

      if (!isString(appID) || !isString(appSecret)) {
        return next(new InvalidClientApplicationError(appID))
      }

      const application = config.apps.knownClientApplications.find(
        (app) => app._id === appID && app.secret === appSecret
      )

      if (!application) {
        return next(new InvalidClientApplicationError(appID))
      }

      next()
    }
  }

  public static JsonHeadersValidation(req: Request, _res: Response, next: NextFunction) {
    const acceptHeader = req.headers.accept

    if (!acceptHeader) {
      return next(new InvalidJsonHeadersError(acceptHeader))
    }

    const contentTypes = acceptHeader.split(';')[0]
    if (!contentTypes) {
      return next(new InvalidJsonHeadersError(acceptHeader))
    }

    const contentTypeArray = contentTypes.split(',')
    return contentTypeArray.indexOf('application/json') >= 0
      ? next()
      : next(new InvalidJsonHeadersError(acceptHeader))
  }

  public static userValidationCallback(
    error: Error,
    user: User,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    if (error || !user) {
      const notFound = true
      res.status(StatusCodes.UNAUTHORIZED).json({ notFound }).end()
    } else {
      req.user = user
      return next()
    }
  }
}
