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
import {
  decodeSnapshotID,
  encodeSnapshotID,
} from '../../../../../src/Utilities/CfWorker/SnapshotIdCodec'

describe('SnapshotIdCodec', () => {
  it('round-trips a docID and snapshot id', () => {
    const encoded = encodeSnapshotID('project-1#manuscript-1', 'snapshot-uuid')
    expect(decodeSnapshotID(encoded)).toEqual({
      docID: 'project-1#manuscript-1',
      id: 'snapshot-uuid',
    })
  })

  it('round-trips a docID that itself contains "#" and ":"', () => {
    const encoded = encodeSnapshotID('tenant:project#manuscript', 'snap#1')
    expect(decodeSnapshotID(encoded)).toEqual({
      docID: 'tenant:project#manuscript',
      id: 'snap#1',
    })
  })

  it('always ends with the #v3 suffix', () => {
    expect(encodeSnapshotID('doc', 'id')).toMatch(/#v3$/)
  })

  it('returns undefined for a plain Postgres-style UUID (no #v3 suffix)', () => {
    expect(decodeSnapshotID('550e8400-e29b-41d4-a716-446655440000')).toBeUndefined()
  })

  it('returns undefined for a string that ends with #v3 but is not valid base64url JSON', () => {
    expect(decodeSnapshotID('not-valid-base64!!!#v3')).toBeUndefined()
  })

  it('returns undefined for valid base64url that decodes to JSON missing docID/id', () => {
    const payload = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf8').toString('base64url')
    expect(decodeSnapshotID(`${payload}#v3`)).toBeUndefined()
  })

  it('does not throw on an empty string', () => {
    expect(() => decodeSnapshotID('')).not.toThrow()
    expect(decodeSnapshotID('')).toBeUndefined()
  })
})
