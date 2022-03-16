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
  SchemaDefinition as OttomanSchemaDefinition,
  ModelOptions as OttomanModelOptions,
} from 'ottoman'
import { IndexedRepository } from '../Interfaces/IndexedRepository'
import { IdentifiableEntity } from '../Interfaces/IdentifiableEntity'
import { QueryCriteria } from '../Interfaces/QueryCriteria'
import { QueryOptions } from '../Interfaces/QueryOptions'
import mem from 'mem'

/**
 * manages the operation of caching the results of the database operations.
 */
export class MemorizingRepository<
  TEntity extends object,
  TNewEntity extends Partial<IdentifiableEntity>,
  TUpdateEntity extends Partial<IdentifiableEntity>,
  TQueryCriteria extends QueryCriteria
> implements IndexedRepository<TEntity, TNewEntity, Partial<TUpdateEntity>, TQueryCriteria>
{
  constructor(
    protected repository: IndexedRepository<
      TEntity,
      TNewEntity,
      Partial<TUpdateEntity>,
      TQueryCriteria
    >,
    cacheTTLSeconds: number
  ) {
    this.cacheTTLSeconds = cacheTTLSeconds
  }

  /* istanbul ignore next */
  public get documentType(): string {
    return this.repository.documentType
  }

  /* istanbul ignore next */
  public async create(newDocument: TNewEntity): Promise<TEntity> {
    return this.repository.create(newDocument)
  }

  /* istanbul ignore next */
  public async upsert(id: string, newDocument: TNewEntity): Promise<TEntity> {
    return this.repository.upsert(id, newDocument)
  }

  /* istanbul ignore next */
  public async update(updatedDocument: TUpdateEntity): Promise<TEntity> {
    return this.repository.update(updatedDocument)
  }

  /* istanbul ignore next */
  public async patch(id: string, dataToPatch: TUpdateEntity): Promise<TEntity> {
    return this.repository.patch(id, dataToPatch)
  }

  /* istanbul ignore next */
  public async touch(key: string, expiry: number): Promise<void> {
    return this.repository.touch(key, expiry)
  }

  /* istanbul ignore next */
  public async getOne(criteria: TQueryCriteria): Promise<TEntity | null> {
    return this.repository.getOne(criteria)
  }

  /* istanbul ignore next */
  public async count(criteria: TQueryCriteria | null): Promise<number> {
    return this.repository.count(criteria)
  }

  /* istanbul ignore next */
  public async getAll(criteria: TQueryCriteria, options: QueryOptions | null): Promise<TEntity[]> {
    return this.repository.getAll(criteria, options)
  }

  /* istanbul ignore next */
  public async remove(criteria: TQueryCriteria | null): Promise<boolean> {
    return this.repository.remove(criteria)
  }

  /* istanbul ignore next */
  public fullyQualifiedId(id: string): string {
    return this.repository.fullyQualifiedId(id)
  }

  /* istanbul ignore next */
  public buildSchemaDefinition(): OttomanSchemaDefinition {
    return this.repository.buildSchemaDefinition()
  }

  /* istanbul ignore next */
  public buildModelOptions(): OttomanModelOptions {
    return this.repository.buildModelOptions()
  }

  public async getById(id: string): Promise<TEntity | null> {
    return this.memoizingGetById(id)
  }

  private _cacheTTLSeconds: number
  get cacheTTLSeconds(): number {
    return this._cacheTTLSeconds
  }

  set cacheTTLSeconds(ttl: number) {
    this._cacheTTLSeconds = ttl
    this.memoizingGetById = this.createMemoizingGetById(ttl * 1000)
  }

  private createMemoizingGetById = (ttl: number) =>
    mem(
      (id: string) => {
        return this.repository.getById(id)
      },
      { maxAge: ttl }
    )
  private memoizingGetById = this.createMemoizingGetById(this.cacheTTLSeconds * 1000)
}
