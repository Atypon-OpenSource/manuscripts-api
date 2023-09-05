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

import { NextFunction } from 'express'

import { TestBaseRoute } from '../../../data/fixtures/BaseRoute'

describe('BaseRoute - runWithErrorHandling', () => {
  test('should execute the logic successfully', async () => {
    const baseRoute: any = new TestBaseRoute()
    const logic = () => {
      return Promise.resolve()
    }
    const next: NextFunction = () => {
      return Promise.resolve()
    }

    await baseRoute.runWithErrorHandling(logic, next)
  })

  test('should execute the logic and failed', async () => {
    const baseRoute: any = new TestBaseRoute()
    const logic = async () => {
      throw new TypeError('an error occurred while executing the login')
    }
    const next: NextFunction = async (error) => {
      expect(error.message).toBe('an error occurred while executing the login')
    }
    await baseRoute.runWithErrorHandling(logic, next)
  })
})
