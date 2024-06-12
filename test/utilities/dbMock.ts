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
const mockTransactionClient = {
  manuscriptDoc: {
    findDocument: jest.fn().mockResolvedValue({
      version: 0,
      steps: [],
    }),
    updateDocument: jest.fn(),
  },
}
jest.mock('../../src/DataAccess/Repository', () => {
  return {
    Repository: jest.fn(() => ({
      connectClient: jest.fn(),
     getDB: jest.fn(() => {
        return {
          $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn({
            manuscriptDoc: {
              findDocument: jest.fn(), // Use the mock function here
              updateDocument: jest.fn(),
            },
          })),
          manuscriptDoc: {
            findDocument: jest.fn(), // Also mock it here for consistency
            updateDocument: jest.fn(),
          },
        }
      }),
      documentClient: jest.fn(),
      projectClient: jest.fn(),
      userClient: jest.fn(),
      snapshotClient: jest.fn(),
      eventClient: jest.fn(),
    })),
  }
})

export {}
