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

import { SchemaDefinition as OttomanSchemaDefinition, ModelInstance as OttomanModelInstance } from 'ottoman'

import { CBRepository } from '../CBRepository'
import { IClientApplicationRepository } from '../Interfaces/IClientApplicationRepository'
import { ClientApplication, ClientApplicationQueryCriteria } from '../../Models/ClientApplicationModels'

import { required, maxLength } from '../validators'
import { CouchbaseError } from 'couchbase'
import { DatabaseError, ValidationError } from '../../Errors'
import { ensureValidDocumentType } from '../Interfaces/IndexedRepository'
import { isString } from 'lodash'
import { log } from '../../Utilities/Logger'

/**
 * Manages application persistent storage operations.
 * A client application is identified by a key and a secret so that we can validate
 * which client applications or versions of applications are allowed to connect to the server.
 */
export class ClientApplicationRepository extends CBRepository
<ClientApplication, ClientApplication, ClientApplication, ClientApplicationQueryCriteria>
implements IClientApplicationRepository {

  /**
   * Returns document type.
   */
  public get documentType (): string {
    return 'Application'
  }

  /**
   * Builds an application model from an application object.
   */
  public buildModel (application: ClientApplication): ClientApplication {
    return {
      ...application
    }
  }

  public buildSchemaDefinition (): OttomanSchemaDefinition {
    return {
      _id: {
        type: 'string',
        auto: 'uuid',
        readonly: true
      },
      name: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'name')
          maxLength(val, 100, 'name')
        }
      },
      secret: {
        type: 'string',
        validator: (val: string) => {
          required(val, 'secret')
          maxLength(val, 100, 'secret')
        }
      },
      details: {
        type: 'string',
        validator: (val: string) => {
          maxLength(val, 100, 'details')
        }
      }
    }
  }

  public async ensureApplicationsExist (applications: ReadonlyArray<ClientApplication>): Promise<void> {
    await Promise.all(applications.map(app => {
      ensureValidDocumentType(app, this.documentType)
      return new Promise<void>((resolve, reject) => {
        const id = app._id
        if (!isString(id)) {
          return reject(new ValidationError('Application record lacks _id', app))
        }

        this.database.bucket.upsert(id, app, (error: CouchbaseError | number | null, _result: OttomanModelInstance<ClientApplication> | undefined) => {
          if (error) {
            return reject(DatabaseError.fromPotentiallyNumericalError(error, 'Error occurred when attempting to upsert known application', JSON.stringify(app)))
          }
          return resolve()
        })
      })
    }))
    log.debug('Applications existence ensured.')
  }
}
