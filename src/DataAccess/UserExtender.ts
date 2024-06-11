/*!
 * © 2024 Atypon Systems LLC
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

import { Prisma, PrismaClient } from '@prisma/client'
import { v4 as uuid_v4 } from 'uuid'

import { CreateUser } from '../Models/UserModels'

//TODO: Remove default values for email & connectUserID in schema.prisma, and make them unique
export class UserExtender {
  readonly USER_MODEL = 'user'
  private extensions: ReturnType<typeof this.buildExtensions>

  constructor(private readonly prisma: PrismaClient) {}

  getExtension() {
    this.extensions = this.buildExtensions()
    return this.extend()
  }
  private buildExtensions() {
    return {
      createUser: this.createUser,
      findByEmail: this.findByEmail,
      findByConnectID: this.findByConnectID,
      findByID: this.findByID,
      updateConnectID: this.updateConnectID,
    }
  }

  private extend() {
    return Prisma.defineExtension({
      name: this.USER_MODEL,
      model: {
        [this.USER_MODEL]: this.extensions,
      },
    })
  }

  private createUser = async (payload: CreateUser) => {
    const user = await this.prisma.user.create({
      data: {
        id: this.userID(),
        ...payload,
      },
    })
    return user
  }
  private findByEmail = async (email: string) => {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
      },
    })
    return user
  }
  private findByConnectID = async (connectUserID: string) => {
    const user = await this.prisma.user.findFirst({
      where: {
        connectUserID,
      },
    })
    return user
  }
  private findByID = async (id: string) => {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    })
    return user
  }

  private updateConnectID = async (id: string, connectUserID: string) => {
    const updated = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        connectUserID,
      },
    })
    return updated
  }

  private userID() {
    return `User_${uuid_v4()}`
  }
}
