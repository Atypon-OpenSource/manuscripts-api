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

import {
  CfWorkerClient,
  CfWorkerRequestError,
} from '../../../../../src/Utilities/CfWorker/CfWorkerClient'

const BASE_URL = 'https://cf-worker.example.test'
const TENANT_ID = 'tenant-1'
const SECRET = 'shared-secret'

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response
}

describe('CfWorkerClient', () => {
  it('signs an HS256 JWT with userID and tenantID and sends it as a bearer token', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ doc: { type: 'doc' }, version: 3 }))
    const client = new CfWorkerClient(BASE_URL, TENANT_ID, SECRET, fetchImpl)

    await client.getDocument('connect-user-1', 'proj#manuscript')

    expect(fetchImpl).toHaveBeenCalledWith(
      `${BASE_URL}/v3/doc/proj%23manuscript`,
      expect.objectContaining({ method: 'GET' })
    )
    const call = fetchImpl.mock.calls[0][1]
    const authHeader = call.headers.Authorization as string
    expect(authHeader.startsWith('Bearer ')).toBe(true)
    const token = authHeader.replace('Bearer ', '')
    const payload = jwt.verify(token, SECRET) as { userID: string; tenantID: string }
    expect(payload.userID).toBe('connect-user-1')
    expect(payload.tenantID).toBe(TENANT_ID)
  })

  it('returns the parsed document on success', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ doc: { type: 'doc' }, version: 3 }))
    const client = new CfWorkerClient(BASE_URL, TENANT_ID, SECRET, fetchImpl)

    const result = await client.getDocument('connect-user-1', 'docID')

    expect(result).toEqual({ doc: { type: 'doc' }, version: 3 })
  })

  it('throws a CfWorkerRequestError carrying the upstream status code on a non-2xx response', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ error: 'Forbidden' }, 403))
    const client = new CfWorkerClient(BASE_URL, TENANT_ID, SECRET, fetchImpl)

    await expect(client.getDocument('connect-user-1', 'docID')).rejects.toMatchObject({
      statusCode: 403,
    })
    await expect(client.getDocument('connect-user-1', 'docID')).rejects.toBeInstanceOf(
      CfWorkerRequestError
    )
  })

  it('posts steps with a JSON body and strips nothing the caller does not ask for', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({ type: 'steps', steps: [], clientIDs: [7], version: 4 }))
    const client = new CfWorkerClient(BASE_URL, TENANT_ID, SECRET, fetchImpl)

    const result = await client.receiveSteps('connect-user-1', 'docID', [{ a: 1 }], 7, 3)

    expect(fetchImpl).toHaveBeenCalledWith(
      `${BASE_URL}/v3/doc/docID/steps`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ steps: [{ a: 1 }], clientID: 7, version: 3 }),
      })
    )
    expect(result).toEqual({ type: 'steps', steps: [], clientIDs: [7], version: 4 })
  })

  it('requests steps-since with the version as a query parameter', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ steps: [], clientIDs: [], version: 9 }))
    const client = new CfWorkerClient(BASE_URL, TENANT_ID, SECRET, fetchImpl)

    await client.getStepsSince('connect-user-1', 'docID', 5)

    expect(fetchImpl).toHaveBeenCalledWith(
      `${BASE_URL}/v3/doc/docID/steps?since=5`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('unwraps the snapshots array from listSnapshots', async () => {
    const label = { id: 'abc', name: 'v1', createdAt: 111 }
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ snapshots: [label] }))
    const client = new CfWorkerClient(BASE_URL, TENANT_ID, SECRET, fetchImpl)

    const result = await client.listSnapshots('connect-user-1', 'docID')

    expect(result).toEqual([label])
  })

  it('rejects an empty connectUserID (an unlinked account) before sending any request, rather than sharing an anonymous cf-worker identity across every unlinked user', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ doc: {}, version: 0 }))
    const client = new CfWorkerClient(BASE_URL, TENANT_ID, SECRET, fetchImpl)

    await expect(client.getDocument('', 'docID')).rejects.toMatchObject({ statusCode: 403 })
    await expect(client.getDocument('', 'docID')).rejects.toBeInstanceOf(CfWorkerRequestError)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
