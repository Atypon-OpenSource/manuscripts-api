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

import { BaseRoute } from '../../../../src/Controller/BaseRoute'
import { initRouter } from '../../../../src/Controller/InitRouter'
import { getRoutes as getRoutesV2 } from '../../../../src/Controller/V2/Routes'

describe('initRouter', () => {
  describe('initRouter', () => {
    it('should create a router and initialize routes', () => {
      const routes: BaseRoute[] = getRoutesV2()
      const router = initRouter(routes)
      expect(router).toBeDefined()
      expect(router).toBeInstanceOf(Function)
    })

    it('should register additional routes in development mode', () => {
      const routes: BaseRoute[] = []
      const router = initRouter(routes)
      expect(router.stack).toHaveLength(process.env.NODE_ENV !== 'production' ? 2 : 0)
    })
  })
})
