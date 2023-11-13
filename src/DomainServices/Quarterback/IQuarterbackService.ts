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

export interface IQuarterbackService {
  getDocument(docId: string): Promise<Buffer>
  createDocument(document: object): Promise<Buffer>
  updateDocument(document: Buffer, docId: string): Promise<Buffer>
  deleteDocument(docId: string): Promise<Buffer>
  receiveSteps(body: object, docId: string): Promise<any>
  listen(docId: string): Promise<any>
  getStepFromVersion(docId: string, versionId: string): Promise<any>
  getSnapshotLabels(docId: string): Promise<Buffer>
  getSnapshot(docId: string): Promise<Buffer>
  deleteSnapshot(docId: string): Promise<Buffer>
  createSnapshot(document: Buffer): Promise<Buffer>
}
