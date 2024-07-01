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

import FormData from 'form-data'
import getStream from 'get-stream'
import fetch from 'node-fetch'
import { PassThrough, Readable } from 'stream'

import { RequestError } from '../Errors'

export class PressroomService {
  constructor(private baseurl: string, private apiKey: string) {}

  public async importJATS(stream: Readable): Promise<Readable> {
    const form = new FormData()
    form.append('file', await getStream.buffer(stream), {
      filename: 'file.zip',
      contentType: 'application/zip',
    })

    const headers = {
      ...form.getHeaders(),
      'pressroom-api-key': this.apiKey,
    }

    const res = await fetch(`${this.baseurl}/api/v2/import/jats`, {
      method: 'POST',
      body: form,
      headers,
    })
    if (res.ok && res.body) {
      const duplex = new PassThrough()
      res.body.pipe(duplex)
      return duplex
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Pressroom request 'import/zip' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }

  public async fetchHtml(archive: Buffer, manuscriptID: string): Promise<Buffer> {
    const form = new FormData()
    form.append('file', archive, { filename: 'file.zip', contentType: 'application/zip' })
    form.append('manuscriptID', manuscriptID)

    const headers = {
      ...form.getHeaders(),
      'pressroom-api-key': this.apiKey,
    }

    const res = await fetch(`${this.baseurl}/api/v2/export/html`, {
      method: 'POST',
      body: form,
      headers,
    })
    if (res.ok && res.body) {
      return getStream.buffer(res.body)
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Pressroom request 'export/html' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }
}
