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

import { SGRepository } from '../SGRepository'
import { NoBucketError } from '../../Errors'

class SnapshotRepository extends SGRepository<any, any, any, any> {
  public get objectType(): string {
    return 'MPSnapshot'
  }

  public get bucketName(): string {
    if (!this.database.bucket) {
      throw new NoBucketError()
    }

    return (this.database.bucket as any)._name
  }
}

export { SnapshotRepository }
