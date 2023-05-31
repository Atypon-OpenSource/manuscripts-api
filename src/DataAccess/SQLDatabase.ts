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

import { Prisma } from '@prisma/client'

import { BucketKey, DatabaseConfiguration } from '../Config/ConfigurationTypes'
import { InvalidBucketError, NoBucketError } from '../Errors'
import { log } from '../Utilities/Logger'
import { Index, indices as getIndices } from './DatabaseIndices'
import prisma from './prismaClient'

interface SQLBucket {
  _name: string

  disconnect(): Promise<void>

  append(key: string | Buffer, fragment: any): void

  insert(doc: any): Prisma.PromiseReturnType<any>

  insertMany(docs: any): Prisma.PromiseReturnType<any>

  query(query: any): Prisma.PromiseReturnType<any>

  queryRaw(query: string): Prisma.PromiseReturnType<any>

  findUnique(query: any): Prisma.PromiseReturnType<any>

  findFirst(query: any): Prisma.PromiseReturnType<any>

  findMany(query: any): Prisma.PromiseReturnType<any>

  replace(key: string | Buffer, value: any): void

  remove(query: any): Prisma.PromiseReturnType<any>

  updateMany(query: any, data: any): Prisma.PromiseReturnType<any>

  update(id: string, value: any): Prisma.PromiseReturnType<any>

  upsert(id: string, value: any): Prisma.PromiseReturnType<any>

  count(query: any): Prisma.PromiseReturnType<any>
}

class PrismaBucket implements SQLBucket {
  name: BucketKey
  prismaClient: Prisma.UserDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>
  constructor(name: BucketKey) {
    this.name = name
    this.prismaClient = prisma[this.name] as any
  }
  _name: string
  append(_key: string | Buffer, _fragment: any): Promise<void> {
    return Promise.resolve()
  }
  query(query: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.findMany({
      where: query,
    })
  }
  queryRaw(query: string): Prisma.PromiseReturnType<any> {
    return prisma.$queryRaw(query as any)
  }
  findUnique(query: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.findUnique({
      where: query,
    })
  }
  findFirst(query: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.findFirst({
      where: query,
    })
  }
  findMany(query: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.findMany({
      where: query,
    })
  }
  replace(id: string, doc: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.update({
      where: {
        id,
      },
      data: doc,
    })
  }
  update(id: string, doc: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.update({
      where: {
        id,
      },
      data: doc,
    })
  }
  upsert(id: string, doc: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.upsert({
      where: {
        id,
      },
      update: doc,
      create: Object.assign({ ...doc }, { id }),
    })
  }
  insert(doc: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.create({
      data: doc,
    })
  }

  insertMany(docs: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.createMany({
      data: docs,
    })
  }

  count(query: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.count({
      where: query,
    })
  }
  remove(query: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.deleteMany({
      where: query,
    })
  }
  updateMany(query: any, data: any): Prisma.PromiseReturnType<any> {
    return this.prismaClient.updateMany({
      where: query,
      data,
    })
  }
  disconnect(): Promise<void> {
    return prisma.$disconnect()
  }
}

/**
 * Load and run database models. Make sure database configurations are correct.
 */
export class SQLDatabase {
  private _bucket: PrismaBucket

  private isLoaded = false

  public constructor(readonly configuration: DatabaseConfiguration, readonly bucketKey: BucketKey) {
    if (!configuration.buckets[bucketKey]) {
      throw new InvalidBucketError(bucketKey)
    }
  }

  public async isViewServiceAlive(): Promise<void> {
    return Promise.resolve()
  }

  public get bucket(): PrismaBucket {
    return this._bucket
  }

  public get bucketName(): string {
    const bucketName = this.configuration.buckets[this.bucketKey]
    if (!bucketName) {
      throw new NoBucketError()
    }
    return bucketName
  }

  public async loadDatabaseModels(): Promise<void> {
    if (this.isLoaded) {
      return
    }

    log.info('loadDatabaseModels 1')

    await this.buildIndices(getIndices(this.bucketKey))

    log.info('loadDatabaseModels 2')

    this.isLoaded = true

    await prisma.$connect().catch(function (err: any) {
      log.error(`An error occurred while connecting to db`, err)
    })

    log.info('loadDatabaseModels 3')

    this._bucket = new PrismaBucket(this.bucketKey)
    return Promise.resolve()
  }

  public ensureAlive(): Promise<void> {
    return Promise.resolve()
  }

  public createIndex(_indexCreateStatement: string): Promise<boolean> {
    log.info('createIndex 1')
    return prisma
      .$executeRawUnsafe(`${_indexCreateStatement}`)
      .then(() => {
        return true
      })
      .catch((error: any) => {
        log.error(`An error occurred while ${_indexCreateStatement}`, error)
        return false
      })
  }

  public async buildIndices(indexingArray: Index[]): Promise<void> {
    for (const index of indexingArray) {
      await this.createIndex(index.script)
    }
  }

  static ensureDBExtensions(): Promise<boolean> {
    return Promise.resolve(true)
  }
}
