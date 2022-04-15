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

import { Repository } from './Repository'

export interface KeyValueRepository<TEntity, TNewEntity, TUpdateEntity, TPatchEntity>
  extends Repository<TEntity> {
  /**
   * Returns object type
   */
  objectType: string

  /**
   * Creates new document.
   * @param newDocument The new document wants to be added.
   */
  create(newDocument: TNewEntity, userId?: string): Promise<TEntity>

  /**
   * Removes existing document.
   * @param id the document's unique id.
   */
  remove(id: string | null, userId?: string): Promise<void>

  /**
   * Replaces existing document.
   * @param id document id's wants to be replaced.
   * @param updateDocument The new object that will be replaced.
   */
  update(id: string, updateDocument: TUpdateEntity, userId?: string): Promise<TEntity>

  patch(id: string, dataToPatch: TPatchEntity, userId?: string): Promise<TEntity>

  purge(id: string): Promise<void>
}
