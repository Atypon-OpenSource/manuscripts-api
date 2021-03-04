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

import { IShacklesService } from './IShacklesService'
import FormData from 'form-data'
import fetch from 'node-fetch'
import { RequestError } from '../../Errors'

export class ShacklesService implements IShacklesService {
  constructor (private baseurl: string) {}

  public async createSnapshot (archive: Buffer, token: string) {
    const form = new FormData()
    form.append('file', archive, { filename: 'file.zip', contentType: 'application/zip' })

    const headers = {
      ...form.getHeaders(),
      'authorization': `Bearer ${token}`
    }
    const res = await fetch(`${this.baseurl}/api/v2/snapshot`,{ method: 'POST', body: form, headers })
    if (res.ok) {
      return res.body
    }
    throw new RequestError(`Shackles request '/snapshot' failed with error: code(${res.status}) - message(${res.statusText})`)
  }
}
