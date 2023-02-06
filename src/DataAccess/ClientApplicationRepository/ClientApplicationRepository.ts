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

//import { log } from '../../Utilities/Logger'
import { Prisma } from '@prisma/client'
import { isString } from 'lodash'

import { DatabaseError, ValidationError } from '../../Errors'
import {
  ClientApplication,
  ClientApplicationQueryCriteria,
} from '../../Models/ClientApplicationModels'
import { IClientApplicationRepository } from '../Interfaces/IClientApplicationRepository'
import { ensureValidDocumentType } from '../Interfaces/IndexedRepository'
import { SQLRepository } from '../SQLRepository'
import { maxLength, required } from '../validators'

/**
 * Manages application persistent storage operations.
 * A client application is identified by a key and a secret so that we can validate
 * which client applications or versions of applications are allowed to connect to the server.
 */
export class ClientApplicationRepository
  extends SQLRepository<
    ClientApplication,
    ClientApplication,
    ClientApplication,
    ClientApplicationQueryCriteria
  >
  implements IClientApplicationRepository
{
  /**
   * Returns document type.
   */
  public get documentType(): string {
    return 'Application'
  }

  /**
   * Builds an application model from an application object.
   */
  public buildModel(application: ClientApplication): ClientApplication {
    return {
      ...application,
    }
  }

  public buildSchemaDefinition(): any {
    return {
      _id: {
        type: 'string',
        auto: 'uuid',
        readonly: true,
      },
      name: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'name')
          maxLength(val, 100, 'name')
        },
      },
      secret: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'secret')
          maxLength(val, 100, 'secret')
        },
      },
      details: {
        type: 'string',
        validator: (val: string) => {
          maxLength(val, 100, 'details')
        },
      },
    }
  }

  public async ensureApplicationsExist(
    applications: ReadonlyArray<ClientApplication>
  ): Promise<void> {
    await Promise.all(
      applications.map((app) => {
        ensureValidDocumentType(app, this.documentType)
        return new Promise<void>((resolve, reject) => {
          const id = app._id
          if (!isString(id)) {
            return reject(new ValidationError('Application record lacks _id', app))
          }
          // eslint-disable-next-line promise/catch-or-return
          this.database.bucket
            .upsert(id, this.buildPrismaModel(app))
            .catch((error: Prisma.PrismaClientKnownRequestError) =>
              reject(
                DatabaseError.fromPrismaError(
                  error,
                  `Error in ensureApplicationsExist of type ${this.documentType}`,
                  JSON.stringify(app)
                )
              )
            )
            .then(() => resolve())
        })
      })
    )
    //log.debug('Applications existence ensured.')
    return Promise.resolve()
  }
}
