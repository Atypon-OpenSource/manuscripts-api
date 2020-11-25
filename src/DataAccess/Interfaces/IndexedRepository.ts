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

import {
  N1qlStringQuery,
  InsertOptions,
  ReplaceOptions,
  UpsertOptions
} from 'couchbase'
import { SchemaDefinition, ModelOptions } from 'ottoman'

import { QueryOptions } from './QueryOptions'
import { ValidationError } from '../../Errors'
import { IDatabaseViewManager } from './IDatabaseViewManager'
import { IdentifiableEntity, TypedEntity } from './IdentifiableEntity'
import { QueryCriteria } from './QueryCriteria'
import { Repository } from './Repository'
import { KeyValueRepository } from './KeyValueRepository'

/**
 * Manages document persistent storage operations.
 */
export interface IndexedRepository<
  TEntity,
  TNewEntity extends Partial<IdentifiableEntity>,
  TUpdateEntity extends Partial<IdentifiableEntity>,
  TQueryCriteria extends QueryCriteria
> extends IDatabaseViewManager, Repository<TEntity> {
  /**
   * Returns document type
   */
  documentType: string

  /**
   * Creates new document.
   * @param newDocument The new document wants to be added.
   */
  create (newDocument: TNewEntity, options: CreateOptions): Promise<TEntity>

  /**
   * Replaces existing document.
   * @param id document id's wants to be replaced.
   * @param newDocument The new object that will be replaced.
   */
  update (
    updatedDocument: TUpdateEntity,
    options: UpdateOptions
  ): Promise<TEntity>

  /**
   * Replaces values for the keys specified. Leaves any other keys unmodified on the document.
   * @param id document id's wants to be patched.
   * @param dataToPatch document properties want to be patched.
   */
  patch (
    id: string,
    dataToPatch: TUpdateEntity,
    options: UpdateOptions
  ): Promise<TEntity>

  /**
   * Update document ttl.
   * @param key The new document key wants to be added.
   * @param expiry document ttl in seconds.
   */

  touch (key: string, expiry: number): Promise<void>

  /**
   * Returns single document based on criteria.
   * @param criteria extra where conditions.
   */
  getOne (criteria: TQueryCriteria): Promise<TEntity | null>

  /**
   * Returns count of documents based on criteria.
   * @param criteria extra where conditions.
   */
  count (criteria: TQueryCriteria | null): Promise<number>

  /**
   * Returns all document based on criteria.
   * @param criteria extra where conditions.
   */
  getAll (
    criteria: TQueryCriteria,
    options: QueryOptions | null
  ): Promise<TEntity[]>

  /**
   * Removes existing document.
   * @param criteria Extra update criteria.
   */
  remove (criteria: TQueryCriteria | null): Promise<boolean>

  /**
   * Returns document id schema saved in couchbase.
   * @param id document unique id.
   */
  fullyQualifiedId (id: string): string

  buildSchemaDefinition (): SchemaDefinition

  buildModelOptions (): ModelOptions
}

export interface CreateOptions extends InsertOptions {}

export interface UpdateOptions extends ReplaceOptions {}

export interface PatchOptions extends UpsertOptions {}

export function ensureTypeBound (query: N1qlStringQuery): N1qlStringQuery {
  const queryStr = (query as any).options.statement
  if (queryStr.indexOf(`_type = `) < 0) {
    throw new ValidationError(
      'N1QL query should contain "_type" as part of its WHERE clause',
      queryStr
    )
  }
  return query
}

/** Sets the document's _type property if it were null before. Throws an exception if an unexpected non-null value is set. */
export function ensureValidDocumentType (
  document: Partial<IdentifiableEntity>,
  documentType: string
): void {
  if (document._type && document._type !== documentType) {
    throw new ValidationError(
      `Document has unexpected _type (${document._type} != ${documentType})`,
      document
    )
  } else if (!document._type) {
    document._type = documentType
  }
}

export interface RepositoryLike
  extends IndexedRepository<
    TypedEntity,
    Partial<IdentifiableEntity>,
    Partial<IdentifiableEntity>,
    QueryCriteria
  > {}

export interface SGRepositoryLike
  extends KeyValueRepository<
    TypedEntity,
    Partial<IdentifiableEntity>,
    Partial<IdentifiableEntity>,
    QueryCriteria
  > {}
