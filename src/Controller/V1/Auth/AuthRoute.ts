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
import { BucketSessions } from '../../../Models/UserModels'
import {
  credentialsSchema,
  googleRedirectSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  discourseLoginSchema,
  discourseAccountSchema,
  iamOAuthCallbackSchema,
  iamOAuthStartSchema,
  backchannelLogoutSchema,
  serverToServerAuthSchema,
  authorizationTokenSchema
} from './AuthSchema'
import { AuthController } from './AuthController'
import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import {
  SYNC_GATEWAY_COOKIE_NAME,
  SYNC_GATEWAY_COOKIE_EXPIRY_IN_MS
} from '../../../DomainServices/Sync/SyncService'
import { config } from '../../../Config/Config'
import { BucketKey } from '../../../Config/ConfigurationTypes'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { DiscourseController } from '../../../DomainServices/Discourse/DiscourseController'

export class AuthRoute extends BaseRoute {

  private authController = new AuthController()
  private discourseController = DIContainer.sharedContainer.discourseService
                                ? new DiscourseController(DIContainer.sharedContainer.discourseService)
                                : null

  /**
   * Returns auth route base path.
   *
   * @returns string
   */
  private get basePath (): string {
    return '/auth'
  }

  public create (router: Router): void {
    router.post(
      `${this.basePath}/login`,
      expressJoiMiddleware(credentialsSchema, {}),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.applicationValidation(),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const {
            token,
            syncSessions,
            user
          } = await this.authController.login(req)

          this.setSyncCookies(syncSessions, res)

          res
            .status(HttpStatus.OK)
            .json({ token, recover: user.deleteAt ? true : false })
            .end()
        }, next)
      }
    )

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
            syncSessions
          } = await this.authController.serverToServerAuth(req)

          this.setSyncCookies(syncSessions, res)

          res
            .status(HttpStatus.OK)
            .json({ token })
            .end()
        }, next)
      }
    )

    const discourseController = this.discourseController
    if (discourseController) {
      router.get(
        `${this.basePath}/discourseLogin`,
        expressJoiMiddleware(discourseLoginSchema, {}),
        AuthStrategy.JsonHeadersValidation,
        (req: Request, res: Response, next: NextFunction) => {
          return this.runWithErrorHandling(async () => {
            res.status(HttpStatus.OK)
              .json(discourseController.discourseLogin(req))
              .end()
          }, next)
        }
      )

      router.get(
        `${this.basePath}/discourseAccount`,
        AuthStrategy.JWTAuth,
        expressJoiMiddleware(discourseAccountSchema, {}),
        (req: Request, res: Response, next: NextFunction) => {
          return this.runWithErrorHandling(async () => {
            res.status(HttpStatus.OK)
              .json(await discourseController.discourseAccountDetails(req))
              .end()
          }, next)
        }
      )
    }

    router.get(
      `${this.basePath}/google`,
      expressJoiMiddleware(googleLoginSchema, {}),
      AuthStrategy.applicationValidation(),
      AuthStrategy.googleLogin
    )

    router.get(
      `${this.basePath}/google/callback`,
      expressJoiMiddleware(googleRedirectSchema, { validationCallback:
        (_req: Request, res: Response, next: NextFunction) => {
          return (error: any, _value: any) => {
            if (error) {
              res.redirect(`${config.email.fromBaseURL}/login#${stringify({
                error: 'validation-error'
              })}`)
            } else {
              return next()
            }
          }
        }
      }),
      AuthStrategy.googleRedirect,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          if (!req.user || !req.user.syncSessions) {
            res.redirect(`${config.email.fromBaseURL}/login#${stringify({
              error: 'user-not-found'
            })}`)
          } else {
            this.setSyncCookies(req.user.syncSessions, res)
            res.redirect(`${config.email.fromBaseURL}/login#${stringify({
              access_token: req.user.token
            })}`)
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
          const { redirectUri, deviceId, theme, redirectBaseUri, action } = req.query
          // Redirect user to IAM OAuth start endpoint
          const {
            url,
            nonce
          } = await DIContainer.sharedContainer.authService.iamOAuthStartData(
            {
              deviceId,
              redirectUri,
              theme,
              redirectBaseUri
            },
            action
          )

          this.setNonceCookie(nonce, res)

          res.redirect(url)
        }, next)
      }
    )

    // IAM callback endpoint where user gets redirected to by IAM server, after user login/registration
    router.get(
      `${this.basePath}/iam/callback`,
      expressJoiMiddleware(iamOAuthCallbackSchema, {}),
      AuthStrategy.verifyIAMToken,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          this.clearNonceCookie(res)
          if (req.query.error) {
            const errorDescription = req.query.error_description
            res.redirect(DIContainer.sharedContainer.authService.iamOAuthErrorURL(errorDescription))
          } else {
            const state = DIContainer.sharedContainer.authService.decodeIAMState(req.query.state)
            const params = removeEmptyValuesFromObj({ redirectUri: state.redirectUri, theme: state.theme })
            const serverUrl =
              state.redirectBaseUri && config.IAM.authServerPermittedURLs.includes(state.redirectBaseUri) ?
                state.redirect_base_uri :
                config.IAM.libraryURL
            try {
              const { token, syncSessions, user } = await this.authController.iamOAuthCallback(req, state)

              if (!user) {
                res.redirect(`${serverUrl}/login#${stringify({ error: 'user-not-found' })}`)
              } else {
                this.setSyncCookies(syncSessions, res)
                res.redirect(`${serverUrl}/login?${stringify(params)}#${stringify({
                  access_token: token,
                  recover: user.deleteAt ? true : false
                })}`)
              }
            } catch (error) {
              res.redirect(`${serverUrl}/login#${stringify({ error: 'error', error_description: error.message })}`)
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
          res
            .status(HttpStatus.NO_CONTENT)
            .end()
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
            syncSessions
          } = await this.authController.resetPassword(req)

          this.setSyncCookies(syncSessions, res)
          res
            .status(HttpStatus.OK)
            .json({ token })
            .end()
        }, next)
      })

    router.post(
      `${this.basePath}/logout`,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.authController.logout(req)
          this.clearSyncCookies(res)
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
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const sessions = await this.authController.refreshSyncSessions(req)

          this.setSyncCookies(sessions, res)
          res.status(HttpStatus.NO_CONTENT).send()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/changePassword`,
      expressJoiMiddleware(changePasswordSchema,{}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.authController.changePassword(req)
          res.status(HttpStatus.OK)
             .end()
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
            json: () => res.send({ token })
          })
        }, next)
      }
    )
  }

  private cookieKey = (bucketKey: string) => `/${config.DB.buckets[bucketKey as BucketKey]}`

  private cookieOptions = (
    domain: string,
    includeAge: boolean,
    path?: string
  ) => ({
    path,
    domain,
    maxAge: includeAge ? SYNC_GATEWAY_COOKIE_EXPIRY_IN_MS : 0,
    httpOnly: true,
    sameSite: 'None',
    secure: config.server.storeOnlySSLTransmittedCookies
  })

  private clearSyncCookies (res: Response) {
    for (const key of [BucketKey.Data]) {
      res.clearCookie(
        this.cookieKey(key),
        this.cookieOptions(
          config.gateway.cookieDomain,
          false,
          this.cookieKey(key)
        )
      )
    }
  }

  private setSyncCookies (syncSessions: BucketSessions, res: Response) {
    for (const [key, session] of Object.entries(syncSessions)) {
      res.cookie(
        SYNC_GATEWAY_COOKIE_NAME,
        session,
        this.cookieOptions(
          config.gateway.cookieDomain,
          true,
          this.cookieKey(key)
        )
      )
    }
  }

  private clearNonceCookie (res: Response) {
    res.clearCookie(
      'nonce',
      this.cookieOptions(config.gateway.cookieDomain, false)
    )
  }

  private setNonceCookie (nonce: string, res: Response) {
    res.cookie(
      'nonce',
      nonce,
      this.cookieOptions(config.gateway.cookieDomain, true)
    )
  }
}
