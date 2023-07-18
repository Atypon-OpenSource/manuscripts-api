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

export class ConfigService {
  private _configData: { [index: string]: any }

  get configData(): { [key: string]: any } {
    return this._configData
  }

  constructor() {
    this._configData = {}
  }

  private async loadFile(filePath: string): Promise<void> {
    const fileContent = await fs.promises.readFile(filePath, 'utf8')
    this._configData[filePath] = JSON.parse(fileContent)
  }

  private async loadData(directoryPath: string): Promise<void> {
    const files = await fs.promises.readdir(directoryPath)
    for (const file of files) {
      const filePath = path.join(directoryPath, file)
      const stats = await fs.promises.stat(filePath)
      if (stats.isFile() && path.extname(file) === '.json') {
        await this.loadFile(filePath)
      }
    }
  }

  async loadConfigData(directoryPath: string, fileName?: string, id?: string): Promise<any> {
    const fullKey = fileName ? path.resolve(directoryPath, fileName) : path.resolve(directoryPath)

    if (fileName) {
      if (!this._configData[fullKey]) {
        await this.loadFile(fullKey)
        this.loadData(directoryPath).catch((error) => {
          log.error('Error while reading directory in background:', error)
        })
      }

      if (!this._configData[fullKey]) {
        log.error('file not found?')
        return null
      }
      const data = this._configData[fullKey]
      return id ? data.find((item: any) => item._id === id) : data
    }

    if (!this._configData[fullKey]) {
      await this.loadData(directoryPath)
    }

    const resolvedDirectoryPath = path.resolve(directoryPath)

    return Object.keys(this._configData)
      .filter((key) => key.startsWith(resolvedDirectoryPath))
      .reduce<{ [key: string]: any }>((res, key) => ((res[key] = this._configData[key]), res), {})
  }
}
