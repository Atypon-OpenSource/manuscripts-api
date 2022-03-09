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

import '../../../../utilities/configMock'

import * as HttpStatus from 'http-status-codes'
import * as supertest from 'supertest'

import { fetchTemplates } from '../../../../api'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { drop, dropBucket, seed, testDatabase } from '../../../../utilities/db'
import { SeedOptions } from '../../../../../src/DataAccess/Interfaces/SeedOptions'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'

const seedOptions: SeedOptions = { users: true, applications: true, templates: true, projects: true }

let db: any = null
beforeAll(async () => {
  db = await testDatabase()
})

afterAll(async () => db.bucket.disconnect())

jest.setTimeout(TEST_TIMEOUT)

describe('TemplateService - Fetch published templates', () => {
  beforeEach(async () => {
    await drop()
    await dropBucket(BucketKey.Data)
    await seed(seedOptions)
  })

  test('Should fetch list of templates', async () => {
    const response: supertest.Response = await fetchTemplates()
    expect(response.status).toBe(HttpStatus.OK)
    const templates: [] = JSON.parse(response.text)
    expect(templates.length).toBeGreaterThan(0)
  })
}
)
