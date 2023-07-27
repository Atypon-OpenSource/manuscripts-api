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
import { promisify } from 'util'

import { log } from '../Utilities/Logger'

const readFile = promisify(fs.readFile)

interface Cache {
  [id: string]: any[]
}

export class ConfigService {
  private fileCache: Cache = {}
  private dataCache: Cache = {}

  constructor(private directoryPath: string) {
    this.loadFiles().catch((error) => log.error(`Error loading files: ${error}`))
  }

  private async loadFiles() {
    try {
      const filenames = fs.readdirSync(this.directoryPath)
      const jsonFilenames = filenames.filter((filename) => path.extname(filename) === '.json')
      for (const filename of jsonFilenames) {
        const filePath = path.join(this.directoryPath, filename)
        this.fileCache[filename] = await this.loadFile(filePath)
      }
    } catch (error) {
      log.error('Error occurred while reading directory:', error)
      throw error
    }
  }

  private async loadFile(filePath: string) {
    try {
      const data = await readFile(filePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      log.error(`Error occurred while reading file: ${filePath}`)
      throw error
    }
  }

  public getData(ids: string | string[], fileName: string) {
    if (!this.fileCache[fileName]) {
      throw new Error(`File ${fileName} not found in cache.`)
    }

    if (!ids) {
      return this.fileCache[fileName]
    }

    if (Array.isArray(ids)) {
      return ids.map((singleId) => this.retrieve(singleId, fileName))
    } else {
      return this.retrieve(ids, fileName)
    }
  }

  private retrieve(id: string, fileName: string) {
    if (!this.dataCache[id] && this.fileCache[fileName]) {
      const data: any = this.fileCache[fileName]
      const item = data[id] ? data[id] : data.find((item: any) => item._id === id)

      if (item) {
        this.dataCache[id] = item
      } else {
        throw new Error(`Item with id ${id} not found in file ${fileName}.`)
      }
    }

    return this.dataCache[id]
  }
}
