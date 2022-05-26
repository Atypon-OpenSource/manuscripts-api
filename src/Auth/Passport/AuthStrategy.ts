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

import { Request, Response, NextFunction } from 'express'
import passport from 'passport'
import * as HttpStatus from 'http-status-codes'
import { stringify } from 'qs'
import { IpFilter } from 'express-ipfilter'
import cookie from 'cookie'

import { isString, removeEmptyValuesFromObj } from '../../util'
import * as jsonwebtoken from 'jsonwebtoken'
import { UserClaim } from '../Interfaces/UserClaim'
import { config } from '../../Config/Config'
import { DIContainer } from '../../DIContainer/DIContainer'
import {
  InvalidClientApplicationError,
  InvalidJsonHeadersError,
  InvalidCredentialsError,
  InvalidServerCredentialsError,
  InvalidBackchannelLogoutError,
  MissingCookieError,
  ValidationError,
} from '../../Errors'
import { APP_ID_HEADER_KEY, APP_SECRET_HEADER_KEY } from '../../Controller/V1/Auth/AuthController'
import { authorizationBearerToken } from '../../Controller/BaseController'
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
    passport.authenticate(AuthStrategyTypes.jwt, {}, (error: Error, user: UserClaim) => {
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
        return next(new InvalidCredentialsError('Invalid token.'))
      })(req, res, next)
    }
  }

  public static verifyIAMToken(req: Request, res: Response, next: NextFunction) {
    const idToken: string = req.query.id_token as string

    const decode = jsonwebtoken.decode(idToken, { complete: true })

    if (
      // typeof decode !== 'object' ||
      decode === null ||
      !decode.payload ||
      !decode.header
    ) {
      return next(new InvalidCredentialsError('Invalid IAM token.'))
    }

    const {
      payload,
      header: { kid: keyID },
    } = decode

    if (!req.headers.cookie) {
      return next(new MissingCookieError())
    }

    const parsedCookie = cookie.parse(req.headers.cookie)

    const state = DIContainer.sharedContainer.authService.decodeIAMState(req.query.state as string)
    const params = removeEmptyValuesFromObj({
      redirectUri: state.redirectUri,
      theme: state.theme,
    })

    DIContainer.sharedContainer.jwksClient.getSigningKey(keyID as string, (error, key) => {
      if (error) {
        return res.redirect(`${config.IAM.libraryURL}/error?${stringify(params)}#error=error`)
      }

      if (!key) {
        return res.redirect(`${config.IAM.libraryURL}/error?${stringify(params)}#error=invalid-key`)
      }

      try {
        DIContainer.sharedContainer.iamTokenVerifier.loginVerify(
          idToken,
          key.rsaPublicKey,
          parsedCookie.nonce,
          (payload as any).aud
        )
      } catch (error) {
        return res.redirect(
          `${config.IAM.libraryURL}/error?${stringify(params)}#error=invalid-token`
        )
      }
      req.user = payload
      next()
    })
  }

  public static verifyLogoutToken(req: Request, _res: Response, next: NextFunction) {
    const idToken: string = req.query.logout_token as string

    const decoded = jsonwebtoken.decode(idToken, { complete: true })

    if (
      // typeof decoded !== 'object' ||
      decoded === null ||
      !decoded.payload ||
      !decoded.header
    ) {
      return next(new InvalidCredentialsError('Invalid logout token.'))
    }

    const {
      payload,
      header: { kid: keyID },
    } = decoded

    DIContainer.sharedContainer.jwksClient.getSigningKey(keyID as string, (error, key) => {
      if (error) {
        return next(new InvalidBackchannelLogoutError('Error verifying token', error))
      }

      if (!key) {
        return next(new InvalidBackchannelLogoutError('Missing key', (decoded as any).kid))
      }

      try {
        DIContainer.sharedContainer.iamTokenVerifier.logoutVerify(
          idToken,
          key.rsaPublicKey,
          (payload as any).aud
        )
      } catch (error) {
        return next(new InvalidBackchannelLogoutError('Invalid token', idToken))
      }

      next()
    })
  }

  public static verifyAdminToken(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return next(new InvalidServerCredentialsError('Admin token not set.'))
    }

    const adminToken = authorizationBearerToken(req)

    try {
      jsonwebtoken.verify(adminToken, config.auth.serverSecret)
    } catch (e) {
      return next(new InvalidServerCredentialsError('Admin token is invalid.'))
    }

    return next()
  }

  /**
   * Returns anExpress Middleware function that reads application ID and application secret values from headers or query parameters, and validates them
   */
  public static applicationValidation() {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      const applicationRepository = DIContainer.sharedContainer.applicationRepository

      let appId = req.headers[APP_ID_HEADER_KEY]
      let appSecret = req.headers[APP_SECRET_HEADER_KEY]

      if (!appId) {
        appId = req.query[APP_ID_HEADER_KEY] as string
        appSecret = req.query[APP_SECRET_HEADER_KEY] as string
      }

      if (!isString(appId)) {
        return next(new InvalidClientApplicationError(appId))
      }

      const application = await applicationRepository.getById(appId)
      if (!application) {
        return next(new InvalidClientApplicationError(appId))
      } else if (appSecret && application.secret !== null) {
        if (!isString(appSecret) || application.secret !== appSecret) {
          return next(new InvalidServerCredentialsError(appId))
        }
      }

      next()
    }
  }

  public static verifyIpAddress(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV !== 'test') {
      return IpFilter(config.literatum.allowedIPAddresses, { mode: 'allow' })(req, res, next)
    }

    return next()
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
    error: Error | null,
    user: UserClaim | null,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    if (error || !user) {
      const notFound = true
      res.status(HttpStatus.UNAUTHORIZED).json({ notFound }).end()
    } else {
      req.user = user
      return next()
    }
  }
}
