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

import { BaseRoute } from '../../BaseRoute'
import { InvitationController } from './InvitationController'
import {
  inviteSchema,
  rejectSchema,
  acceptSchema,
  uninviteSchema,
  containerInviteSchema,
  requestInvitationTokenSchema,
  refreshInvitationTokenSchema,
  accessSharedUriSchema,
} from './InvitationSchema'
import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'

export class InvitationRoute extends BaseRoute {
  private invitationController = new InvitationController()

  /**
   * Returns invitation route base path.
   *
   * @returns string
   */
  private get basePath(): string {
    return '/invitation'
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}/invite`,
      expressJoiMiddleware(inviteSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.invitationController.invite(req)

          res.status(HttpStatus.OK).json(result).end()
        }, next)
      }
    )

    router.post(
      [`${this.basePath}/:containerID/invite`, `${this.basePath}/project/:containerID/invite`],
      expressJoiMiddleware(containerInviteSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.invitationController.inviteToContainer(req)

          res.status(HttpStatus.OK).json(result).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/reject`,
      expressJoiMiddleware(rejectSchema, {}),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.invitationController.reject(req)
          res.status(HttpStatus.OK).json(result).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/accept`,
      expressJoiMiddleware(acceptSchema, {}),
      (req: Request, res: Response, next: NextFunction) => {
        if (req.body.invitationId.startsWith('MPContainerInvitation')) {
          AuthStrategy.JWTAuth(req, res, next)
        } else {
          next()
        }
      },
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.invitationController.accept(req)
          res.status(HttpStatus.OK).json(result).end()
        }, next)
      }
    )

    router.delete(
      `${this.basePath}`,
      expressJoiMiddleware(uninviteSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const result = await this.invitationController.uninvite(req)
          res.status(HttpStatus.OK).json(result).end()
        }, next)
      }
    )

    router.get(
      [`${this.basePath}/:containerID/:role`, `${this.basePath}/project/:containerID/:role`],
      expressJoiMiddleware(requestInvitationTokenSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const token = await this.invitationController.requestInvitationToken(req)
          res.status(HttpStatus.OK).send(token).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:containerType/access`,
      expressJoiMiddleware(accessSharedUriSchema, {}),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          const response = await this.invitationController.acceptInvitationToken(req)
          res.status(HttpStatus.OK).send(response).end()
        }, next)
      }
    )

    router.post(
      `${this.basePath}/:containerID/:role`,
      expressJoiMiddleware(refreshInvitationTokenSchema, {}),
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.invitationController.refreshInvitationToken(req)
          res.status(HttpStatus.OK).end()
        }, next)
      }
    )
  }
}
