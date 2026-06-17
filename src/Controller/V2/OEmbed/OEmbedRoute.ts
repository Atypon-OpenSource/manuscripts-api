/*!
 * © 2026 Atypon Systems LLC
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

import { celebrate } from '../../../Utilities/celebrate'
import { BaseRoute } from '../../BaseRoute'
import { OEmbedController } from './OEmbedController'
import { oEmbedHtmlQuerySchema } from './OEmbedSchema'

type OEmbedHtmlQuery = {
  url: string
  maxwidth: number
  maxheight: number
}

export class OEmbedRoute extends BaseRoute {
  private oEmbedController = new OEmbedController()

  private get basePath(): string {
    return '/oembed'
  }

  private async getHtml(req: Request, res: Response) {
    const query = req.query as unknown as OEmbedHtmlQuery
    const { url, maxwidth, maxheight } = query
    const html = await this.oEmbedController.getOEmbedHtml(url, maxwidth, maxheight)
    res
      .status(StatusCodes.OK)
      .json({ html: html ?? null })
      .end()
  }

  public create(router: Router): void {
    router.get(
      `${this.basePath}/html`,
      celebrate(oEmbedHtmlQuerySchema),
      (req: Request, res: Response, next: NextFunction) => {
        return this.runWithErrorHandling(async () => {
          await this.getHtml(req, res)
        }, next)
      }
    )
  }
}
