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

import { LibraryCollection } from '@manuscripts/json-schema'

import { LibraryCollectionLike } from '../Interfaces/Models'
import { PatchLibraryCollection } from '../../Models/LibraryCollectionModels'
import { ILibraryCollectionRepository } from '../Interfaces/ILibraryCollectionRepository'
import { ContainerRepository } from '../ContainerRepository/ContainerRepository'

export class LibraryCollectionRepository
  extends ContainerRepository<LibraryCollection, LibraryCollectionLike, PatchLibraryCollection>
  implements ILibraryCollectionRepository
{
  public get objectType(): string {
    return 'MPLibraryCollection'
  }

  /*public async update (
    _id: string,
    _updatedDocument: LibraryCollectionLike,
  ): Promise<LibraryCollection> {
    throw new MethodNotAllowedError('LibraryCollectionRepository', 'update')
  }*/
}
