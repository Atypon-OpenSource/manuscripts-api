/*!
 * © 2022 Atypon Systems LLC
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

import prisma from './prismaClient'

export class AccessControlRepository {
  public static async channel(channels: string[], docId: string): Promise<void> {
    const promises = []
    for (const channel of channels) {
      promises.push(
        prisma.channel
          .create({
            data: {
              docId,
              name: channel,
            },
          })
          .catch(() => {
            // pass
          })
      )
    }
    await Promise.all(promises)
  }

  public static getChannels(docId: string): Promise<any[]> {
    return prisma.channel.findMany({ where: { docId } })
  }

  public static async access(users: string[], channels: string[]): Promise<void> {
    const promises = []
    for (const channel of channels) {
      for (const userId of users) {
        promises.push(
          prisma.access
            .create({
              data: {
                userId,
                channelName: channel,
              },
            })
            .catch(() => {
              // pass
            })
        )
      }
    }
    await Promise.all(promises)
  }

  public static getAccess(userId?: string, channelName?: string): Promise<any[]> {
    if (!userId && !channelName) {
      return Promise.resolve([])
    }

    const q = {
      where: {},
    } as any

    if (userId) {
      q.where.userId = userId
    }

    if (channelName) {
      q.where.channelName = channelName
    }

    return prisma.access.findMany(q)
  }

  public static async remove(docId: string): Promise<void> {
    const channels = await this.getChannels(docId as string)
    for (const channel of channels) {
      const accesses = await this.getAccess(undefined, channel.name)
      for (const access of accesses) {
        await prisma.access.delete({ where: { id: access.id } })
      }
      await prisma.channel.delete({ where: { name: channel.name } })
    }
  }

  public static async removeAll(): Promise<void> {
    await prisma.access.deleteMany({})
    await prisma.channel.deleteMany({})
  }
}
