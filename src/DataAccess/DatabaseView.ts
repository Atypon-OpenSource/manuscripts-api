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

export type DatabaseViewName = string
export type DesignDocumentName = string
export type DatabaseViewChecksum = string
export type ViewMapFunction = (doc: any, meta: any) => void
export type ViewReduceFunction = (key: string, values: any, rereduce: any) => void

export type DatabaseView = {
  /**
   * View name
   */
  name: DatabaseViewName
  /**
   * The implementation of map function. this function shouldn't be called since it's just a simulation of the database view's map function.
   */
  map: ViewMapFunction
  /**
   * The implementation of reduce function. this function shouldn't be called since it's just a simulation of the database view's reduce function.
   */
  reduce: ViewReduceFunction | null
}

export type DatabaseViewStatus = {
  [key: string]: {
    [key: string]: DatabaseViewChecksum
  }
}

export type DesignDocument = {
  readonly name: DesignDocumentName
  views: {
    [key: string]: NewDatabaseView
  }
  viewsStatus: DatabaseViewStatus
}

export type DatabaseDesignDocument = {
  readonly name: DesignDocumentName
  viewsStatus: {
    [key: string]: DatabaseViewName
  }
  views: {
    [key: string]: NewDatabaseView
  }
}

export type NewDatabaseView = {
  /**
   * The stringified implementation of map function
   */
  map: string
  /**
   * The stringified implementation of reduce function
   */
  reduce?: string | null
}
