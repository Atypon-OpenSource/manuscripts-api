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

import { Request } from 'express'

import { config } from '../../../Config/Config'
import { BucketKey, DatabaseConfiguration } from '../../../Config/ConfigurationTypes'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { InvalidBucketError } from '../../../Errors'
import { BaseController } from '../../BaseController'

export class SGController extends BaseController {
  public constructor(readonly configuration: DatabaseConfiguration = config.DB) {
    super()
  }

  async get(req: Request): Promise<any> {
    const db = req.params.db as BucketKey
    if (!this.configuration.buckets[db] as any) {
      throw new InvalidBucketError(db)
    }

    const id = req.params.id
    return DIContainer.sharedContainer.sgService.get(id)
  }

  async create(req: Request): Promise<any> {
    const db = req.params.db as BucketKey
    if (!this.configuration.buckets[db] as any) {
      throw new InvalidBucketError(db)
    }

    const doc = req.body
    return DIContainer.sharedContainer.sgService.create(doc)
  }

  async update(req: Request): Promise<any> {
    const db = req.params.db as BucketKey
    if (!this.configuration.buckets[db] as any) {
      throw new InvalidBucketError(db)
    }

    const id = req.params.id
    const body = req.body

    return DIContainer.sharedContainer.sgService.update(id, body)
  }

  async remove(req: Request): Promise<any> {
    const db = req.params.db as BucketKey
    if (!this.configuration.buckets[db] as any) {
      throw new InvalidBucketError(db)
    }

    const id = req.params.id
    //const rev = req.query.rev
    return DIContainer.sharedContainer.sgService.remove(id)
  }
}
