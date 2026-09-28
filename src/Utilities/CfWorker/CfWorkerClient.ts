/*!
 * © 2026 Atypon Systems LLC
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
import jwt from 'jsonwebtoken'

import { StatusCoded } from '../../Errors'
import { InternalErrorCode } from '../../InternalErrorCodes'

export class CfWorkerRequestError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.RequestError
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = 'CfWorkerRequestError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export interface CfWorkerDocument {
  doc: Record<string, unknown>
  version: number
}

export interface CfWorkerStepsResult {
  steps: unknown[]
  clientIDs: number[]
  version: number
}

export interface CfWorkerSnapshotLabel {
  id: string
  name: string
  createdAt: number
}

export interface CfWorkerStoredSnapshot extends CfWorkerSnapshotLabel {
  doc: Record<string, unknown>
}

export class CfWorkerClient {
  constructor(
    private readonly baseUrl: string,
    private readonly tenantID: string,
    private readonly jwtSecret: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private token(userID: string): string {
    return jwt.sign({ userID, tenantID: this.tenantID }, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '60s',
    })
  }

  private async request<T>(userID: string, method: string, path: string, body?: unknown): Promise<T> {
    // User.connectUserID defaults to "" (unlinked accounts) and isn't
    // unique — an empty string would still pass cf-worker's own
    // `typeof userID === 'string'` check, so every unlinked user would
    // silently share one anonymous identity there. Reject before ever
    // sending a request.
    if (!userID) {
      throw new CfWorkerRequestError(403, 'Missing connectUserID')
    }
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token(userID)}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText)
      throw new CfWorkerRequestError(response.status, text || response.statusText)
    }
    return (await response.json()) as T
  }

  getDocument(userID: string, docID: string): Promise<CfWorkerDocument> {
    return this.request(userID, 'GET', `/v3/doc/${encodeURIComponent(docID)}`)
  }

  deleteDocument(userID: string, docID: string): Promise<void> {
    return this.request(userID, 'DELETE', `/v3/doc/${encodeURIComponent(docID)}`)
  }

  receiveSteps(
    userID: string,
    docID: string,
    steps: unknown[],
    clientID: number,
    version: number
  ): Promise<CfWorkerStepsResult> {
    return this.request(userID, 'POST', `/v3/doc/${encodeURIComponent(docID)}/steps`, {
      steps,
      clientID,
      version,
    })
  }

  getStepsSince(userID: string, docID: string, since: number): Promise<CfWorkerStepsResult> {
    return this.request(userID, 'GET', `/v3/doc/${encodeURIComponent(docID)}/steps?since=${since}`)
  }

  async listSnapshots(userID: string, docID: string): Promise<CfWorkerSnapshotLabel[]> {
    const result = await this.request<{ snapshots: CfWorkerSnapshotLabel[] }>(
      userID,
      'GET',
      `/v3/doc/${encodeURIComponent(docID)}/snapshots`
    )
    return result.snapshots
  }

  createSnapshot(userID: string, docID: string, name: string): Promise<CfWorkerSnapshotLabel> {
    return this.request(userID, 'POST', `/v3/doc/${encodeURIComponent(docID)}/snapshots`, { name })
  }

  getSnapshot(userID: string, docID: string, snapshotID: string): Promise<CfWorkerStoredSnapshot> {
    return this.request(
      userID,
      'GET',
      `/v3/doc/${encodeURIComponent(docID)}/snapshot/${encodeURIComponent(snapshotID)}`
    )
  }

  deleteSnapshot(userID: string, docID: string, snapshotID: string): Promise<void> {
    return this.request(
      userID,
      'DELETE',
      `/v3/doc/${encodeURIComponent(docID)}/snapshot/${encodeURIComponent(snapshotID)}`
    )
  }
}
