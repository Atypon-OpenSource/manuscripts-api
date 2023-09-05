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

import express from 'express'
import path from 'path'

import { BaseRoute } from './BaseRoute'

/**
 * Creates routes.
 * router Express router.
 */
export function initRouter(routes: BaseRoute[]): express.Router {
  const router: express.Router = express.Router()
  for (const route of routes) {
    route.create(router)
  }

  if (process.env.NODE_ENV !== 'production') {
    router.get(`/spec.json`, (_req, res) => {
      res.sendFile(path.join(__dirname, '..', '..', 'doc', 'spec.json'))
    })

    router.get(`/docs`, (_req, res) => {
      res.sendFile(path.join(__dirname, '..', '..', 'doc', 'index.html'))
    })
  }
  return router
}
