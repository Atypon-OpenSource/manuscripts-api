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

const expressJoiMiddleware = require('express-joi-middleware')
import { NextFunction, Request, Response, Router } from 'express'
import * as HttpStatus from 'http-status-codes'
import { stringify } from 'querystring'
import { removeEmptyValuesFromObj } from '../../../util'

import { BaseRoute } from '../../BaseRoute'
// import { BucketSessions } from '../../../Models/UserModels'
import {
  credentialsSchema,
  googleRedirectSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  iamOAuthCallbackSchema,
  iamOAuthStartSchema,
  backchannelLogoutSchema,
  serverToServerAuthSchema,
  authorizationTokenSchema,
  serverToServerTokenAuthSchema,
} from './AuthSchema'
import { AuthController } from './AuthController'
import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import {
  // SYNC_GATEWAY_COOKIE_NAME,
  SYNC_GATEWAY_COOKIE_EXPIRY_IN_MS,
} from '../../../DomainServices/Sync/SyncService'
import { config } from '../../../Config/Config'
// import { BucketKey } from '../../../Config/ConfigurationTypes'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { URL } from 'url'

export class AuthRoute extends BaseRoute {
  private authController = new AuthController()

  /**
   * Returns auth route base path.
   *
   * @returns string
   */
  private get basePath(): string {
    return '/auth'
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}/login`,
      expressJoiMiddleware(credentialsSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.applicationValidation(),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const {
            token,
            // syncSessions,
            user,
          } = await this.authController.login(req)

          // this.setSyncCookies(syncSessions, res)

          res
            .status(HttpStatus.OK)
            .json({ token, recover: user.deleteAt ? true : false })
            .end()
        }, next)
      }
    )

    // Deprecated, Use: /auth/token/:connectUserID
    router.post(
      `${this.basePath}/admin`,
      expressJoiMiddleware(serverToServerAuthSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.verifyAdminToken,
      AuthStrategy.applicationValidation(),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const {
            token,
            // syncSessions
          } = await this.authController.serverToServerAuth(req)

          // this.setSyncCookies(syncSessions, res)

          res.status(HttpStatus.OK).json({ token }).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/token/:connectUserID`,
      expressJoiMiddleware(serverToServerTokenAuthSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.applicationValidation(),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const { token } = await this.authController.serverToServerTokenAuth(req)

          res.status(HttpStatus.OK).json({ token }).end()
        }, next)
      }
    )

    router.get(
      `${this.basePath}/google`,
      expressJoiMiddleware(googleLoginSchema, {}),
      AuthStrategy.applicationValidation(),
      AuthStrategy.googleLogin
    )

    router.get(
      `${this.basePath}/google/callback`,
      expressJoiMiddleware(googleRedirectSchema, {
        validationCallback: (_req: Request, res: Response, next: NextFunction) => {
          return (error: any, _value: any) => {
            if (error) {
              res.redirect(
                `${config.email.fromBaseURL}/login#${stringify({
                  error: 'validation-error',
                })}`
              )
            } else {
              return next()
            }
          }
        },
      }),
      AuthStrategy.googleRedirect,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          if (!req.user || !req.user.syncSessions) {
            res.redirect(
              `${config.email.fromBaseURL}/login#${stringify({
                error: 'user-not-found',
              })}`
            )
          } else {
            // this.setSyncCookies(req.user.syncSessions, res)
            res.redirect(
              `${config.email.fromBaseURL}/login#${stringify({
                access_token: req.user.token,
              })}`
            )
          }
        }, next)
      }
    )

    // Endpoint to initiate IAM login/registration flow
    // TODO: check for existence of "deviceId" before redirecting the user to IAM Outh flow
    router.get(
      `${this.basePath}/iam`,
      expressJoiMiddleware(iamOAuthStartSchema, {}),
      AuthStrategy.applicationValidation(),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const { redirectUri, deviceId, theme, action } = req.query
          const redirectBaseUri = req.get('referer') ?? null
          // Redirect user to IAM OAuth start endpoint
          const { url, nonce } = await DIContainer.sharedContainer.authService.iamOAuthStartData(
            {
              deviceId,
              redirectUri,
              theme,
              redirectBaseUri,
            } as any,
            action as any
          )

          this.setNonceCookie(nonce, res, redirectBaseUri)

          res.redirect(url)
        }, next)
      }
    )

    function getPermittedUrlFromReferer(referer?: string | null): string {
      let url = config.IAM.libraryURL
      if (referer) {
        const refererHost = new URL(referer).host
        for (const permittedUrl of config.IAM.authServerPermittedURLs) {
          const permittedHost = new URL(permittedUrl).host
          if (permittedHost === refererHost) {
            url = permittedUrl
          }
        }
      }
      return url
    }

    // IAM callback endpoint where user gets redirected to by IAM server, after user login/registration
    router.get(
      `${this.basePath}/iam/callback`,
      expressJoiMiddleware(iamOAuthCallbackSchema, {}),
      AuthStrategy.verifyIAMToken,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const state = DIContainer.sharedContainer.authService.decodeIAMState(
            req.query.state as any
          )
          const serverUrl = getPermittedUrlFromReferer(state.redirectBaseUri)
          this.clearNonceCookie(res, serverUrl)
          if (req.query.error) {
            const errorDescription = req.query.error_description
            res.redirect(
              DIContainer.sharedContainer.authService.iamOAuthErrorURL(
                errorDescription as any,
                serverUrl
              )
            )
          } else {
            const params = removeEmptyValuesFromObj({
              redirectUri: state.redirectUri,
              theme: state.theme,
            })
            try {
              const { token, /*syncSessions,*/ user } = await this.authController.iamOAuthCallback(
                req,
                state
              )

              if (!user) {
                res.redirect(`${serverUrl}/login#${stringify({ error: 'user-not-found' })}`)
              } else {
                // this.setSyncCookies(syncSessions, res, serverUrl)
                res.redirect(
                  `${serverUrl}/login?${stringify(params)}#${stringify({
                    access_token: token,
                    recover: user.deleteAt ? true : false,
                  })}`
                )
              }
            } catch (error) {
              res.redirect(
                `${serverUrl}/login#${stringify({
                  error: 'error',
                  error_description: error.message,
                })}`
              )
            }
          }
        }, next)
      }
    )

    router.post(
      `${this.basePath}/backchannel_logout`,
      AuthStrategy.verifyLogoutToken,
      expressJoiMiddleware(backchannelLogoutSchema, {}),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.authController.backchannelLogout(req)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/sendForgottenPassword`,
      expressJoiMiddleware(forgotPasswordSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.authController.sendPasswordResetInstructions(req)
          res.status(HttpStatus.NO_CONTENT).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/resetPassword`,
      expressJoiMiddleware(resetPasswordSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.applicationValidation(),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const {
            token,
            // syncSessions
          } = await this.authController.resetPassword(req)

          // this.setSyncCookies(syncSessions, res)
          res.status(HttpStatus.OK).json({ token }).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/logout`,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          // const referer = req.get('referer')
          await this.authController.logout(req)
          // this.clearSyncCookies(res, referer)
          res.redirect(
            HttpStatus.TEMPORARY_REDIRECT,
            `${config.IAM.authServerURL}/api/oidc/logout?redirect=${config.email.fromBaseURL}`
          )
        }, next)
      }
    )

    router.post(
      `${this.basePath}/refreshSyncSessions`,
      AuthStrategy.JWTAuth,
      (_req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          // const sessions = await this.authController.refreshSyncSessions(req)
          // const referer = req.get('referer')
          // this.setSyncCookies(sessions, res, referer)
          res.status(HttpStatus.NO_CONTENT).send()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/changePassword`,
      expressJoiMiddleware(changePasswordSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.authController.changePassword(req)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )

    router.get(
      `/authorization/:scope`,
      AuthStrategy.JWTAuth,
      expressJoiMiddleware(authorizationTokenSchema, {}),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const token = await this.authController.createAuthorizationToken(req)

          res.format({
            text: () => res.send(token),
            json: () => res.send({ token }),
          })
        }, next)
      }
    )
  }

  // private cookieKey = (bucketKey: string) => `/${config.DB.buckets[bucketKey as BucketKey]}`

  private cookieOptions = (domain: string, includeAge: boolean, path?: string) => ({
    path,
    domain,
    maxAge: includeAge ? SYNC_GATEWAY_COOKIE_EXPIRY_IN_MS : 0,
    httpOnly: true,
    sameSite: (config.server.storeOnlySSLTransmittedCookies && 'None') || 'Strict',
    secure: config.server.storeOnlySSLTransmittedCookies,
  })

  private clearNonceCookie(res: Response, referer?: string) {
    const refererDomain = AuthRoute.getCookieDomain(referer)
    res.clearCookie('nonce', this.cookieOptions(refererDomain, false) as any)
  }

  private setNonceCookie(nonce: string, res: Response, referer?: string | null) {
    const refererDomain = AuthRoute.getCookieDomain(referer)
    res.cookie('nonce', nonce, this.cookieOptions(refererDomain, true) as any)
  }

  private static getCookieDomain(referer?: string | null) {
    const refererHost = referer ? new URL(referer).host : config.gateway.cookieDomain
    return !refererHost.startsWith('.')
      ? refererHost.substring(refererHost.indexOf('.'))
      : refererHost
  }
}
