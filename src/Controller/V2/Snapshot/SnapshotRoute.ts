/*!
 * © 2023 Atypon Systems LLC
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

import { NextFunction, Request, Response, Router } from 'express'
import { StatusCodes } from 'http-status-codes'

import { AuthStrategy } from '../../../Auth/Passport/AuthStrategy'
import { celebrate } from '../../../Utilities/celebrate'
import { BaseRoute } from '../../BaseRoute'
import { SnapshotController } from './SnapshotController'
import {
  createSnapshotSchema,
  deleteSnapshotSchema,
  getSnapshotLabelsSchema,
  getSnapshotSchema,
} from './SnapshotSchema'

export class SnapshotRoute extends BaseRoute {
  private snapshotController = new SnapshotController()

  private get basePath(): string {
    return '/snapshot'
  }

  public create(router: Router): void {
    router.post(
      `${this.basePath}/:projectID/manuscript/:manuscriptID`,
      celebrate(createSnapshotSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.createSnapshot(req, res)
        }, next)
      }
    )

    router.delete(
      `${this.basePath}/:snapshotID`,
      celebrate(deleteSnapshotSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.deleteSnapshot(req, res)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:snapshotID`,
      celebrate(getSnapshotSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getSnapshot(req, res)
        }, next)
      }
    )

    router.get(
      `${this.basePath}/:projectID/manuscript/:manuscriptID/labels`,
      celebrate(getSnapshotLabelsSchema),
      AuthStrategy.JsonHeadersValidation,
      AuthStrategy.JWTAuth,
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getSnapshotLabels(req, res)
        }, next)
      }
    )
  }

  private async createSnapshot(req: Request, res: Response) {
    const { projectID } = req.params
    const payload = req.body
    const user = req.user
    const result = await this.snapshotController.createSnapshot(projectID, payload, user)
    res.json({ snapshot: result })
  }
  private async deleteSnapshot(req: Request, res: Response) {
    const { snapshotID } = req.params
    const user = req.user
    await this.snapshotController.deleteSnapshot(snapshotID, user)
    res.sendStatus(StatusCodes.OK).end()
  }
  private async getSnapshot(req: Request, res: Response) {
    const { snapshotID } = req.params
    const user = req.user
    const result = await this.snapshotController.getSnapshot(snapshotID, user)
    res.json(result)
  }
  private async getSnapshotLabels(req: Request, res: Response) {
    const { projectID, manuscriptID } = req.params
    const user = req.user
    const result = await this.snapshotController.listSnapshotLabels(projectID, manuscriptID, user)
    if (result.length === 0) {
      res.status(StatusCodes.NOT_FOUND).send('Snapshot labels not found')
    } else {
      res.json({ labels: result })
    }
  }
}
