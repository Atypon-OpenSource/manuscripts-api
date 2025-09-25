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
import { promises as fs } from 'fs'
import path from 'path'

interface Model {
  _id: string
}
interface Template extends Model {
  sectionCategories: string
}

export class ConfigService {
  private store: Promise<Map<string, string>>
  constructor(root: string) {
    this.store = this.init(root)
  }

  private async init(root: string) {
    const bundles = await this.initBundles(root)
    const templates = await this.initTemplates(root)
    const styles = await this.initCslStyles(root)
    const locales = await this.initCslLocales(root)
    const languages = await this.initLanguages(root)
    return new Map<string, string>([...bundles, ...templates, ...styles, ...locales, ...languages])
  }

  private async initBundles(root: string) {
    const models: Model[] = JSON.parse(await fs.readFile(path.join(root, 'bundles.json'), 'utf-8'))
    return this.index(models)
  }

  private async initTemplates(root: string) {
    const templates: Template[] = JSON.parse(
      await fs.readFile(path.join(root, 'templates.json'), 'utf-8')
    )
    for (const template of templates) {
      const file = await fs.readFile(path.join(root, template.sectionCategories), 'utf-8')
      template.sectionCategories = JSON.parse(file)
    }
    return this.index(templates)
  }

  private async initCslStyles(root: string) {
    const styles = new Map<string, string>()
    const dir = path.join(root, 'csl', 'styles')
    const files = await fs.readdir(dir)
    for (const file of files) {
      const id = file.slice(0, -4)
      const data = await fs.readFile(path.join(dir, file), 'utf-8')
      styles.set(id, data)
    }
    return styles
  }

  private async initCslLocales(root: string) {
    const locales = new Map<string, string>()
    const dir = path.join(root, 'csl', 'locales')
    const files = await fs.readdir(dir)
    for (const file of files) {
      const id = file.slice(8, -4)
      const data = await fs.readFile(path.join(dir, file), 'utf-8')
      locales.set(id, data)
    }
    return locales
  }

  private async initLanguages(root: string) {
    const languages = await fs.readFile(path.join(root, 'languages.json'), 'utf-8')
    const languagesMap = new Map<string, string>()
    languagesMap.set('languages', languages)
    return languagesMap
  }

  private index(models: Model[]) {
    const index = new Map<string, string>()
    models.forEach((v) => index.set(v._id, JSON.stringify(v)))
    return index
  }

  public async getDocument(id: string) {
    const data = await this.store
    return data.get(id)
  }

  public async hasDocument(id: string): Promise<boolean> {
    const data = await this.store
    return data.has(id)
  }
}
