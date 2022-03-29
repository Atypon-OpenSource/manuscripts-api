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
import * as HttpStatus from 'http-status-codes'

import { BaseController, authorizationBearerToken } from '../../BaseController'
import { DatabaseConfiguration, BucketKey } from '../../../Config/ConfigurationTypes'
import { config } from '../../../Config/Config'
import { ISGController } from './ISGController'
import { DIContainer } from '../../../DIContainer/DIContainer'
import { InvalidCredentialsError, InvalidBucketError } from '../../../Errors'
import jsonwebtoken from 'jsonwebtoken'
import { isLoginTokenPayload } from '../../../Utilities/JWT/LoginTokenPayload'

export class SGController extends BaseController implements ISGController {
  readonly repoMap: any

  public constructor(readonly configuration: DatabaseConfiguration = config.DB) {
    super()
    this.repoMap = {}
    for (const repo of DIContainer.sharedContainer.gatewayRepositories) {
      this.repoMap[repo.objectType] = repo
    }
  }

  async get(req: Request): Promise<any> {
    const db = req.params.db as BucketKey

    if (!this.configuration.buckets[db] as any) {
      throw new InvalidBucketError(db)
    }

    const id = req.params.id

    const token = authorizationBearerToken(req)
    const payload = jsonwebtoken.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const objectType = id.split(':')[0]
    return this.repoMap[objectType].getById(id)
  }

  async create(req: Request): Promise<any> {
    const db = req.params.db as BucketKey

    if (!this.configuration.buckets[db] as any) {
      throw new InvalidBucketError(db)
    }
    const doc = req.body

    const token = authorizationBearerToken(req)
    const payload = jsonwebtoken.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const objectType = doc._id.split(':')[0]
    return this.repoMap[objectType].create(doc)
  }

  async update(req: Request): Promise<any> {
    const db = req.params.db as BucketKey

    if (!this.configuration.buckets[db] as any) {
      throw new InvalidBucketError(db)
    }

    const id = req.params.id

    const rev = req.query.rev
    const body = req.body
    body._rev = rev

    const token = authorizationBearerToken(req)
    const payload = jsonwebtoken.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const objectType = id.split(':')[0]
    return this.repoMap[objectType].patch(id, body).catch((err: any) => {
      if (err.statusCode === HttpStatus.BAD_REQUEST) {
        body._id = id
        return this.repoMap[objectType].create(body)
      }
      return Promise.reject(err)
    })
  }

  async remove(req: Request): Promise<any> {
    const db = req.params.db as BucketKey

    if (!this.configuration.buckets[db] as any) {
      throw new InvalidBucketError(db)
    }

    const id = req.params.id

    //const rev = req.query.rev

    const token = authorizationBearerToken(req)
    const payload = jsonwebtoken.decode(token)

    if (!isLoginTokenPayload(payload)) {
      throw new InvalidCredentialsError('Unexpected token payload.')
    }

    const objectType = id.split(':')[0]
    return this.repoMap[objectType].remove(id)
  }
}
