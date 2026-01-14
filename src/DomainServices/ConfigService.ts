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

import { config } from '../config'
import { isString } from '../util'

type Model = {
  _id: string
}

export class ConfigService {
  private store: Map<string, string>

  constructor() {
    this.store = this.readConfig()
  }

  private readConfig() {
    const store = new Map()
    for (const path of config.data.paths) {
      this.readBundles(path)?.forEach((v, k) => store.set(k, v))
      this.readTemplates(path)?.forEach((v, k) => store.set(k, v))
      this.readCslStyles(path)?.forEach((v, k) => store.set(k, v))
      this.readCslLocales(path)?.forEach((v, k) => store.set(k, v))
      this.readLanguages(path)?.forEach((v, k) => store.set(k, v))
    }
    return store
  }

  private readBundles(root: string) {
    const file = path.join(root, 'bundles.json')
    if (!fs.existsSync(file)) {
      return
    }
    const models = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return this.index(models)
  }

  private readTemplates(root: string) {
    const file = path.join(root, 'templates.json')
    if (!fs.existsSync(file)) {
      return
    }
    const templates = JSON.parse(fs.readFileSync(file, 'utf-8'))
    for (const template of templates) {
      if (isString(template.sectionCategories)) {
        const file = fs.readFileSync(path.join(root, template.sectionCategories), 'utf-8')
        template.sectionCategories = JSON.parse(file)
      }
    }
    return this.index(templates)
  }

  private readCslStyles(root: string) {
    const dir = path.join(root, 'csl', 'styles')
    if (!fs.existsSync(dir)) {
      return
    }
    const styles = new Map<string, string>()
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const id = file.slice(0, -4)
      const data = fs.readFileSync(path.join(dir, file), 'utf-8')
      styles.set(id, data)
    }
    return styles
  }

  private readCslLocales(root: string) {
    const dir = path.join(root, 'csl', 'locales')
    if (!fs.existsSync(dir)) {
      return
    }

    const locales = new Map<string, string>()
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const id = file.slice(8, -4)
      const data = fs.readFileSync(path.join(dir, file), 'utf-8')
      locales.set(id, data)
    }
    return locales
  }

  private readLanguages(root: string) {
    const file = path.join(root, 'languages.json')
    if (!fs.existsSync(file)) {
      return
    }
    const languages = fs.readFileSync(file, 'utf-8')
    return new Map([['languages', languages]])
  }

  private index(models: Model[]) {
    const index = new Map<string, string>()
    models.forEach((v) => index.set(v._id, JSON.stringify(v)))
    return index
  }

  public async getDocument(id: string) {
    return this.store.get(id)
  }

  public async hasDocument(id: string): Promise<boolean> {
    return this.store.has(id)
  }
}
