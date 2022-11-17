/*!
 * © 2019 Atypon Systems LLC
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

/**
 * The main function (selectActiveResources) takes an array representing a
 * Manuscript project and "tree-shakes" it to identify only active documents
 * ie those NOT belonging only to a resource that has been deleted.
 *
 * Broadly, this follows these general rules:
 * 1. The MPProject document itself is always included
 * 2. MPManuscript documents are always included
 * 3. MPSection documents are tested to see if they belong to an existing
 * manuscript and are included if so
 * 4. Other documents are discovered by searching within sections in an iterative
 * manner. Children are identified within parent object properties if they are:
 * - strings that match an _id in the project
 * - strings identified with the key "contents" that contain IDs matching a pattern
 * corresponding to manuscript project IDs
 * - arrays that contain strings that are IDs
 * - actual nested objects that have an _id
 */

import {
  CommentAnnotation,
  Contributor,
  Corresponding,
  ElementsOrder,
  Footnote,
  FootnotesOrder,
  Journal,
  Manuscript,
  ManuscriptNote,
  Model,
  ObjectTypes,
  Project,
  Section,
  Snapshot,
  Supplement,
} from '@manuscripts/manuscripts-json-schema'

/**
 * find a document within an array of documents by its _id
 * @return a single document or null if it does not exist
 */
const getDocById = (needle: string, haystack: Model[]): Model | null =>
  haystack.find((doc) => doc._id === needle) || null

const isObjectType =
  <T extends Model>(objectType: ObjectTypes) =>
  (model: Model): model is T =>
    model.objectType === objectType

// all "MP" documents should match this pattern
const IDREGEX = /MP[A-Za-z]+:[A-Za-z0-9-]+/

/**
 * extract document IDs (using regex pattern above) from a longer string
 * @return array of document IDs
 */
export const extractDocumentIDs = (contents: string): string[] => {
  const match = IDREGEX.exec(contents)
  if (!match || !match.length) {
    return []
  }
  const contentsAfter = contents.substr(match.index + match[0].length)
  return [match[0]].concat(extractDocumentIDs(contentsAfter))
}

/**
 * Given a single property (value, key) return any child documents
 * referred to by that property. Refer to top of file for rules on how
 * child documents are identified.
 * @return Array of child documents
 */
export const identifyChildrenFromProperty = <T extends Model>(
  value: unknown,
  key: keyof T | '',
  project: Model[]
): Model[] => {
  let docs: Array<Model | null> = []

  if (value === null) {
    return []
  } else if (Array.isArray(value)) {
    docs = value.map((item) => identifyChildrenFromProperty(item, '', project)[0])
  } else if (typeof value === 'string' && key === 'contents') {
    docs = extractDocumentIDs(value).map((id) => getDocById(id, project))
  } else if (typeof value === 'string') {
    docs = [getDocById(value, project)]
  } else if (typeof value === 'object' && (value as Model)._id) {
    docs = [value as Model]
  }

  // return all truthy values (only) since getDocById can return null
  return docs.filter(Boolean) as Model[]
}

/**
 * Starting with the Manuscripts and Sections in a project, walk through
 * their children to find all documents referred to.
 * @param  project the full project
 * @param  visited set of project IDs that have been visited/are in the current
 * project. This set is also returned at the end of the loop.
 * @param  toVisit Array of documents we already know are in will be searched
 * for references to child document. This array will be visited one-by-one,
 * but will also be added to as we go when other children are identified.
 * @return equivalent to visited.
 */
export const walkChildren = (
  project: Model[],
  visited: Set<string>,
  toVisit: Model[]
): Set<string> => {
  if (!toVisit.length) {
    return visited
  }
  const [head, ...tail] = toVisit

  // if the item to visit is marked as deleted, recur early without
  // adding to the visited list
  if (head._deleted) {
    return walkChildren(project, visited, tail)
  }

  visited = visited.add(head._id)

  const extendedTail = Object.keys(head)
    .reduce((acc, key) => {
      const value = head[key as keyof Model]
      return acc.concat(identifyChildrenFromProperty(value, key as keyof Model, project))
    }, tail)
    .filter((doc) => !visited.has(doc._id))

  return extendedTail.length ? walkChildren(project, visited, extendedTail) : visited
}

/**
 * Main function for this module.
 * @param project array of documents
 * @return active documents
 */
export const selectActiveResources = (project: Model[]) => {
  const projectDoc = project.filter(isObjectType<Project>(ObjectTypes.Project))[0]

  if (!projectDoc) {
    return []
  }

  const root = new Set([projectDoc._id])

  const manuscripts = project.filter(isObjectType<Manuscript>(ObjectTypes.Manuscript))
  const manuscriptIDs = manuscripts.map((doc) => doc._id)
  const sections = project
    .filter(isObjectType<Section>(ObjectTypes.Section))
    .filter((doc) => doc.manuscriptID && manuscriptIDs.includes(doc.manuscriptID))
  const contributors = project
    .filter(isObjectType<Contributor>(ObjectTypes.Contributor))
    .filter((doc) => doc.manuscriptID && manuscriptIDs.includes(doc.manuscriptID) && doc.role)
  const snapshots = project.filter(isObjectType<Snapshot>(ObjectTypes.Snapshot))
  const footnotes = project
    .filter(isObjectType<Footnote>(ObjectTypes.Footnote))
    .filter((doc) => doc.manuscriptID && manuscriptIDs.includes(doc.manuscriptID))
  const journalModel = project.filter(isObjectType<Journal>(ObjectTypes.Journal))
  const corresps = project.filter(isObjectType<Corresponding>(ObjectTypes.Corresponding))
  const supplements = project.filter(isObjectType<Supplement>(ObjectTypes.Supplement))
  const footnotesOrder = project.filter(isObjectType<FootnotesOrder>(ObjectTypes.FootnotesOrder))
  const elementsOrder = project
    .filter(isObjectType<ElementsOrder>(ObjectTypes.ElementsOrder))
    .filter((doc) => doc.manuscriptID && manuscriptIDs.includes(doc.manuscriptID))
  const comments = project.filter(isObjectType<CommentAnnotation>(ObjectTypes.CommentAnnotation))
  const productionNotes = project.filter(isObjectType<ManuscriptNote>(ObjectTypes.ManuscriptNote))

  const toVisit = [
    ...journalModel,
    ...manuscripts,
    ...sections,
    ...contributors,
    ...elementsOrder,
    ...snapshots,
    ...footnotes,
    ...footnotesOrder,
    ...corresps,
    ...supplements,
    ...comments,
    ...productionNotes,
  ]

  const visited = walkChildren(project, root, toVisit)

  return project.filter((doc) => visited.has(doc._id))
}
