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

import getStream from 'get-stream'
import fetch from 'node-fetch'

import { RequestError } from '../../Errors'
import { IQuarterbackService } from './IQuarterbackService'

export class QuarterbackService implements IQuarterbackService {
  constructor(private baseurl: string, private apiKey: string) {}
  async getDocument(docId: string): Promise<Buffer> {
    const res = await fetch(`${this.baseurl}/doc/${docId}`, {
      method: 'GET',
      headers: this.headers,
    })

    if (res.ok && res.body) {
      return getStream.buffer(res.body)
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Quarterback request 'GET doc' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }

  async createDocument(document: object): Promise<Buffer> {
    const res = await fetch(`${this.baseurl}/doc`, {
      method: 'POST',
      body: JSON.stringify(document),
      headers: this.headers,
    })

    if (res.ok && res.body) {
      return getStream.buffer(res.body)
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Quarterback request 'create doc' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }

  async updateDocument(document: Buffer, docId: string): Promise<Buffer> {
    const res = await fetch(`${this.baseurl}/doc/${docId}`, {
      method: 'PUT',
      body: JSON.stringify(document),
      headers: this.headers,
    })

    if (res.ok && res.body) {
      return getStream.buffer(res.body)
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Quarterback request 'update doc' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }

  async deleteDocument(docId: string): Promise<Buffer> {
    const res = await fetch(`${this.baseurl}/doc/${docId}`, {
      method: 'DELETE',
      headers: this.headers,
    })

    if (res.ok && res.body) {
      return getStream.buffer(res.body)
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Quarterback request 'delete doc' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }

  async getSnapshotLabels(docId: string): Promise<Buffer> {
    const res = await fetch(`${this.baseurl}/snapshot/${docId}`, {
      method: 'GET',
      headers: this.headers,
    })

    if (res.ok && res.body) {
      return getStream.buffer(res.body)
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Quarterback request 'get snapshot labels' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }

  async getSnapshot(docId: string): Promise<Buffer> {
    const res = await fetch(`${this.baseurl}/snapshot/${docId}`, {
      method: 'GET',
      headers: this.headers,
    })

    if (res.ok && res.body) {
      return getStream.buffer(res.body)
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Quarterback request 'get snapshot' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }

  async updateSnapshot(document: Buffer, docId: string): Promise<Buffer> {
    const res = await fetch(`${this.baseurl}/snapshot/${docId}`, {
      method: 'PUT',
      body: JSON.stringify(document),
      headers: this.headers,
    })

    if (res.ok && res.body) {
      return getStream.buffer(res.body)
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Quarterback request 'update snapshot' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }

  async deleteSnapshot(docId: string): Promise<Buffer> {
    const res = await fetch(`${this.baseurl}/snapshot/${docId}`, {
      method: 'DELETE',
      headers: this.headers,
    })

    if (res.ok && res.body) {
      return getStream.buffer(res.body)
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Quarterback request 'delete snapshot' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }

  async createSnapshot(document: Buffer): Promise<Buffer> {
    const res = await fetch(`${this.baseurl}/snapshot`, {
      method: 'POST',
      body: JSON.stringify(document),
      headers: this.headers,
    })

    if (res.ok && res.body) {
      return getStream.buffer(res.body)
    }
    // should only apply in case of server client errors
    throw new RequestError(
      `Quarterback request 'create snapshot' failed with error: code(${res.status}) - message(${res.statusText})`
    )
  }
  private get headers() {
    return {
      'quarterback-api-key': this.apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    }
  }
}
