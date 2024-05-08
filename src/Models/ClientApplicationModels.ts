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

import { createHash } from 'crypto'
import { pem2jwk } from 'pem-jwk'

import { ScopedAccessTokenConfiguration } from '../Config/ConfigurationTypes'
import { ValidationError } from '../Errors'

/**
 * Represents all acceptable fields for client application objects (client application = manuscripts-api client).
 */
export interface ClientApplication {
  /**
   * A unique application id.
   */
  _id?: string

  _type: string

  /**
   * A secret for application.
   */
  secret: string | null

  /**
   * The name of the application.
   */
  name: string

  /**
   * Details of application.
   */
  details?: string
}

export function scopeConfigurationsFromSplitString(
  str: string,
  outerSeparator: string,
  innerSeparator: string
): Array<ScopedAccessTokenConfiguration> {
  const splitStr = str.split(outerSeparator)
  return splitStr
    .map((s) => s.split(innerSeparator))
    .map((components) => {
      if (components.length !== 4) {
        throw new ValidationError(`Expecting four components: ${components}`, components)
      }

      const name = components[0]
      const secret = components[1]
      const identifier = createHash('sha256')
        .update(`${name}-${secret}`)
        .digest()
        .toString('base64')
      return {
        name,
        secret,
        publicKeyPEM: components[2] !== '' ? components[2] : null,
        publicKeyJWK: null as any,
        expiry: parseInt(components[3], 10),
        identifier,
      }
    })
    .map((config) => {
      if (config.publicKeyPEM === null) {
        return config
      }
      config.secret = Buffer.from(config.secret, 'base64').toString('utf8')
      config.publicKeyPEM = Buffer.from(config.publicKeyPEM, 'base64').toString('utf8')
      config.publicKeyJWK = pem2jwk(config.publicKeyPEM)
      return config
    })
}

/**
 * Configuration strings can contain application configurations by semicolon separating app tuples.
 * For example "ID1,secret1,name1;ID2,secret2,name2" if outer separator is ';' and inner separator is ','.
 * NOTE! Empty string components will be treated as null.
 */
export function clientApplicationsFromSplitString(
  str: string,
  outerSeparator: string,
  innerSeparator: string
): Array<ClientApplication> {
  const splitStr = str.split(outerSeparator)
  return splitStr
    .map((s) => s.split(innerSeparator))
    .map((components) => {
      if (components.length !== 3) {
        throw new ValidationError(`Expecting three components: ${components}`, components)
      }

      return {
        _id: components[0],
        _type: 'Application',
        secret: components[1].length > 0 ? components[1] : null,
        name: components[2],
      }
    })
}
