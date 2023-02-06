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

import { LibraryCollection } from '@manuscripts/manuscripts-json-schema'

import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { LibraryCollectionRepository } from '../../../../../src/DataAccess/LibraryCollectionRepository/LibraryCollectionRepository'
import { MethodNotAllowedError } from '../../../../../src/Errors'

describe.skip('LibraryCollectionRepository - update', () => {
  test('should not allow the user to use update', () => {
    const repository = new LibraryCollectionRepository(BucketKey.Project, {} as any)

    return expect(repository.update('id', {} as LibraryCollection, {})).rejects.toThrow(
      MethodNotAllowedError
    )
  })
})
