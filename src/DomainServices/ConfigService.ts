/*!
 * © 2023 Atypon Systems LLC
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
import fs from 'fs'
import path from 'path'

import { log } from '../Utilities/Logger'

interface IConfigData {
  [index: string]: any
}

export class ConfigService {
  private _configData: IConfigData = {}

  get configData(): IConfigData {
    return this._configData
  }

  private async loadFile(filePath: string): Promise<void> {
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf8')
      this._configData[filePath] = JSON.parse(fileContent)
    } catch (error) {
      log.error(`Error occurred while reading file: ${filePath}`)
    }
  }

  private async loadFilesInDirectory(directoryPath: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(directoryPath)
      const jsonFiles = files.filter((file) => path.extname(file) === '.json')

      for (const file of jsonFiles) {
        const filePath = path.join(directoryPath, file)
        await this.loadFile(filePath)
      }
    } catch (error) {
      log.error('Error occurred while reading directory:', error)
    }
  }

  private getResolvedKey(directoryPath: string, fileName?: string): string {
    return fileName ? path.resolve(directoryPath, fileName) : path.resolve(directoryPath)
  }

  private async loadConfigDataIfNotInCache(fullKey: string, directoryPath: string): Promise<void> {
    if (!this._configData[fullKey]) {
      if (fullKey.includes('.json')) {
        await this.loadFile(fullKey)
        this.loadFilesInDirectory(directoryPath).catch(() => {
          log.error('Error while reading directory in background')
        })
      } else {
        await this.loadFilesInDirectory(directoryPath)
      }
    }
  }

  async loadConfigData(
    directoryPath: string,
    fileName?: string,
    ids?: string[]
  ): Promise<IConfigData | null> {
    const fullKey = this.getResolvedKey(directoryPath, fileName)

    await this.loadConfigDataIfNotInCache(fullKey, directoryPath)

    if (!this._configData[fullKey]) {
      log.error(`Error occured while reading file ${fullKey}`)
      return null
    }

    if (ids) {
      const data = this._configData[fullKey]
      return data.filter((item: any) => ids.includes(item._id))
    }

    return Object.keys(this._configData)
      .filter((key) => key.startsWith(fullKey))
      .reduce<IConfigData>((res, key) => ((res[key] = this._configData[key]), res), {})
  }
}
