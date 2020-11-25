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

import { config } from './Config'
import { BucketKey } from './ConfigurationTypes'
import { IllegalStateError } from '../Errors'

// The following functions are free functions in a separate module from Config to make mocking independently of the Configuration object easier.

export function appDataPublicGatewayBaseURI (): string {
  return `http://${config.gateway.hostname}:${config.gateway.ports.public}`
}

export function appDataAdminGatewayBaseURI (): string {
  return `http://${config.gateway.hostname}:${config.gateway.ports.admin}`
}

export function appDataPublicGatewayURI (bucketKey: BucketKey): string {
  const bucket = config.DB.buckets[bucketKey]
  if (!bucket) {
    throw new IllegalStateError(`No bucket with key '${bucketKey}' amongst configured buckets with public gateway URI: ${JSON.stringify(config.DB.buckets)}`, config.DB.buckets)
  }
  return `${appDataPublicGatewayBaseURI()}/${bucket}`
}

export function appDataAdminGatewayURI (bucketKey: BucketKey): string {
  const bucket = config.DB.buckets[bucketKey]
  if (!bucket) {
    throw new IllegalStateError(`No bucket with key '${bucketKey}' amongst configured buckets with admin gateway URI: ${JSON.stringify(config.DB.buckets)}`, config.DB.buckets)
  }
  return `${appDataAdminGatewayBaseURI()}/${bucket}`
}
